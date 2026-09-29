"use client";
import { ReactNode, useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const onLock = (e: Event) => ((e as CustomEvent<boolean>).detail ? lenis.stop() : lenis.start());
    window.addEventListener("gsc:lock", onLock);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".rise").forEach((el) =>
        gsap.to(el, {
          opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
          delay: parseFloat(el.dataset.delay || "0"),
          scrollTrigger: { trigger: el, start: "top 90%" },
        }),
      );
      gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
        const s = parseFloat(el.dataset.speed || "0");
        gsap.fromTo(el, { y: s }, {
          y: -s, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
      // The invitation card settles into place as it enters.
      gsap.utils.toArray<HTMLElement>("[data-grow]").forEach((el) =>
        gsap.fromTo(el, { scale: 0.92, opacity: 0.4 }, {
          scale: 1, opacity: 1, ease: "none",
          scrollTrigger: { trigger: el, start: "top 95%", end: "top 35%", scrub: true },
        }),
      );
      // Film frame tilts up from a trapezoid into a flat screen: the brand's "applied motion".
      gsap.utils.toArray<HTMLElement>("[data-tilt]").forEach((el) =>
        gsap.fromTo(el, { rotateX: 28, scale: 0.84, yPercent: 6 }, {
          rotateX: 0, scale: 1, yPercent: 0, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "center 55%", scrub: true },
        }),
      );
      gsap.utils.toArray<HTMLElement>("[data-draw]").forEach((el) =>
        gsap.fromTo(el, { scaleY: 0 }, {
          scaleY: 1, ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top 70%", end: "bottom 60%", scrub: true },
        }),
      );
      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((group) =>
        gsap.from(group.children, {
          y: 40, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08,
          scrollTrigger: { trigger: group, start: "top 85%" },
        }),
      );
    });
    const r = setTimeout(() => ScrollTrigger.refresh(), 300);
    return () => {
      clearTimeout(r);
      ctx.revert();
      gsap.ticker.remove(raf);
      window.removeEventListener("gsc:lock", onLock);
      lenis.destroy();
    };
  }, []);
  return <>{children}</>;
}
