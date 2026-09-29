"use client";
import { ReactNode, useCallback, useEffect, useRef } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

// Where a section link should land: its heading (or eyebrow) just below the sticky nav bar.
function sectionOffset(section: HTMLElement): number {
  const anchor = section.querySelector<HTMLElement>(".label, h2") ?? section;
  const bar = document.querySelector<HTMLElement>(".link-bar");
  const gap = (bar?.offsetHeight ?? 0) + 32;
  return anchor.getBoundingClientRect().top + window.scrollY - gap;
}

// In-page section links (#tracks, #partners…) scroll to the section instead of
// jumping. #register, #track/… and #invite/… are handled by their own panels.
function useSectionLinks(scrollTo: (y: number) => void) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || a.hasAttribute("data-register")) return;
      const hash = a.getAttribute("href")!;
      if (hash.includes("/") || hash === "#register") return;
      const id = hash.slice(1);
      const target = id === "top" || id === "" ? null : document.getElementById(id);
      if (id !== "top" && id !== "" && !target) return;
      e.preventDefault();
      try { history.pushState({}, "", hash); } catch { location.hash = hash; }
      scrollTo(target ? Math.max(0, sectionOffset(target)) : 0);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [scrollTo]);
}

const nativeScroll = (y: number) =>
  window.scrollTo({ top: y, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const scrollTo = useCallback((y: number) => {
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 3) });
    else nativeScroll(y);
  }, []);
  useSectionLinks(scrollTo);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenisRef.current = lenis;
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
          // Hand the cards back to CSS once they land, so hover lifts and transitions
          // do not fight a leftover inline transform and leave a row out of line.
          clearProps: "transform,opacity",
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
      lenisRef.current = null;
    };
  }, []);
  return <>{children}</>;
}
