"use client";
import { useEffect } from "react";

/**
 * Gentle 3D tilt for any element marked [data-tiltcard]: the card tips a few degrees
 * towards the cursor and its content floats slightly above the surface (see .why-grid CSS).
 * Mouse and pen only; off for touch and for reduced motion.
 */
export default function TiltCards() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return undefined;
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-tiltcard]"));
    const MAX = 7; // degrees
    const offs = cards.map((card) => {
      const move = (e: PointerEvent) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--rx", `${(-py * MAX).toFixed(2)}deg`);
        card.style.setProperty("--ry", `${(px * MAX).toFixed(2)}deg`);
        card.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
        card.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
      };
      const enter = () => card.classList.add("is-tilting");
      const leave = () => {
        card.classList.remove("is-tilting");
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointermove", move);
      card.addEventListener("pointerleave", leave);
      return () => {
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", leave);
      };
    });
    return () => offs.forEach((off) => off());
  }, []);
  return null;
}
