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
      // Lines of a list brighten as they reach the middle of the screen, like reading along.
      gsap.utils.toArray<HTMLElement>("[data-light]").forEach((el) =>
        gsap.fromTo(el, { opacity: 0.18 }, {
          opacity: 1, ease: "none",
          scrollTrigger: { trigger: el, start: "top 78%", end: "top 48%", scrub: true },
        }),
      );
      gsap.utils.toArray<HTMLElement>("[data-draw]").forEach((el) =>
        gsap.fromTo(el, { scaleY: 0 }, {
          scaleY: 1, ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top 70%", end: "bottom 60%", scrub: true },
        }),
      );
      // "How it works": on desktop the section holds while the timeline slides left, month by
      // month, and the line draws across; below that it stays vertical and the line draws down.
      const tlm = gsap.matchMedia();
      tlm.add("(min-width: 1081px) and (min-height: 620px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-htl]").forEach((wrap) => {
          const vp = wrap.querySelector<HTMLElement>(".tl-viewport");
          const ol = wrap.querySelector<HTMLElement>(".dates");
          const line = wrap.querySelector<HTMLElement>(".dates-line");
          if (!vp || !ol) return;
          const distance = () => Math.max(0, ol.scrollWidth - vp.clientWidth);
          // The wrapper's extra height is exactly the sideways travel, so the hold lasts as long as the slide.
          const size = () => { wrap.style.height = `calc(100vh - 72px + ${distance()}px)`; };
          size();
          ScrollTrigger.addEventListener("refreshInit", size);
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: wrap, start: "top 72px", end: () => `+=${distance()}`, scrub: 0.6, invalidateOnRefresh: true,
            },
          });
          tl.to(ol, { x: () => -distance(), ease: "none" }, 0);
          if (line) tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
          return () => {
            ScrollTrigger.removeEventListener("refreshInit", size);
            wrap.style.height = "";
          };
        });
      });
      tlm.add("(max-width: 1080px), (max-height: 619px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-htl] .dates-line").forEach((el) =>
          gsap.fromTo(el, { scaleY: 0 }, {
            scaleY: 1, ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top 70%", end: "bottom 60%", scrub: true },
          }),
        );
      });
      // Fan-out: the cards start stacked and tilted at the centre of the grid, then
      // spread into place as you scroll (scrubbed). Wide screens only; phones get a simple rise.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 761px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-fan]").forEach((grid) => {
          const cards = Array.from(grid.children) as HTMLElement[];
          // Deck: stacked on the first card's spot (top left), splayed like a hand of photos,
          // each card under the top one turned a little further around its lower-left corner.
          const offset = (card: HTMLElement) => ({
            x: cards[0].offsetLeft - card.offsetLeft,
            y: cards[0].offsetTop - card.offsetTop,
          });
          const splay = [0, -4, 5, -8, 9, -12];
          const deck = (card: HTMLElement, i: number) => ({
            x: offset(card).x + i * 10,
            y: offset(card).y - i * 6,
            rotation: splay[i % splay.length],
            scale: 1,
          });
          gsap.set(cards, { zIndex: (i: number) => cards.length - i });
          // Then, while the grid is pinned on screen, the cards deal out one after another.
          const tl = gsap.timeline({
            scrollTrigger: {
              // The wrapper is tall and its child is position: sticky, so the section holds still
              // for the deal without GSAP pinning (which would re-parent React's DOM).
              trigger: grid.closest<HTMLElement>(".fan-wrap") ?? grid,
              start: "top 72px", end: "+=110%", scrub: 0.8, invalidateOnRefresh: true,
              // Light the circuit only once every card has landed in its slot.
              onUpdate: (st) => {
                const host = grid.closest(".circuit-host");
                host?.classList.toggle("is-dealt", st.progress > 0.97);
                // Show the "keep scrolling" hint only while the deck is still (mostly) stacked
                host?.classList.toggle("is-stacked", st.progress < 0.12);
              },
              onEnter: () => grid.closest(".circuit-host")?.classList.add("is-stacked"),
              onLeave: () => { const h = grid.closest(".circuit-host"); h?.classList.add("is-dealt"); h?.classList.remove("is-stacked"); },
              onLeaveBack: () => grid.closest(".circuit-host")?.classList.remove("is-stacked"),
            },
          });
          cards.forEach((card, i) => {
            tl.fromTo(card,
              { x: () => deck(card, i).x, y: () => deck(card, i).y, rotation: deck(card, i).rotation, scale: deck(card, i).scale, transformOrigin: "15% 90%" },
              { x: 0, y: 0, rotation: 0, scale: 1, ease: "power2.inOut", duration: 1, immediateRender: true },
              i * 0.18);
          });
        });
      });
      mm.add("(max-width: 760px)", () => {
        gsap.utils.toArray<HTMLElement>("[data-fan]").forEach((grid) => grid.closest(".circuit-host")?.classList.add("is-dealt"));
        gsap.utils.toArray<HTMLElement>("[data-fan]").forEach((grid) =>
          gsap.from(grid.children, {
            y: 40, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, clearProps: "transform,opacity",
            scrollTrigger: { trigger: grid, start: "top 85%" },
          }),
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((group) =>
        gsap.from(group.children, {
          y: 40, opacity: 0, filter: "blur(10px)", duration: 0.9, ease: "power3.out",
          // data-stagger="together" rises as one row, so cards never look out of line mid-reveal.
          stagger: group.dataset.stagger === "together" ? 0 : 0.08,
          // Hand the cards back to CSS once they land, so hover lifts and transitions
          // do not fight a leftover inline transform and leave a row out of line.
          clearProps: "transform,opacity,filter",
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
