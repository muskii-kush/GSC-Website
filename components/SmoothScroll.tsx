"use client";
import { ReactNode, useEffect } from "react";
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
  useSectionLinks(nativeScroll);

  // The only motion on the page: content fades up once, gently, as it enters the screen.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".rise"));
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Two scroll effects, nothing else:
  // 1. the film frame tilts up from a trapezoid into a flat screen as it comes into view;
  // 2. the timeline's line draws down as you read through the dates.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-tilt]").forEach((el) =>
        gsap.fromTo(el, { rotateX: 28, scale: 0.84, yPercent: 6 }, {
          rotateX: 0, scale: 1, yPercent: 0, ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "center 55%", scrub: true },
        }),
      );
      gsap.utils.toArray<HTMLElement>("[data-draw]").forEach((el) =>
        gsap.fromTo(el, { scaleY: 0 }, {
          scaleY: 1, ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top 75%", end: "bottom 55%", scrub: true },
        }),
      );
    });
    const refresh = () => ScrollTrigger.refresh();
    const r = setTimeout(refresh, 300);
    window.addEventListener("load", refresh);
    return () => { clearTimeout(r); window.removeEventListener("load", refresh); ctx.revert(); };
  }, []);

  return <>{children}</>;
}
