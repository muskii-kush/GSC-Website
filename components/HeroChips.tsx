"use client";
import { useEffect, useRef } from "react";
import { heroChips } from "@/lib/content";

/**
 * Small glass chips that float around the hero statement and drift a little
 * with the pointer. Purely decorative: the same facts appear elsewhere on the page.
 */
export default function HeroChips() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="hero-chips" ref={ref} aria-hidden="true">
      {heroChips.map((c, i) => (
        <span key={c.label} className={`hero-chip hero-chip-${i + 1}`}>
          <span className="hero-chip-in">
            <span className="hero-chip-dot" />
            <strong>{c.value}</strong>
            <span>{c.label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
