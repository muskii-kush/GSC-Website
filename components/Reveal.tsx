"use client";
import { ElementType, Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Reveal({
  text, as = "h2", className = "", accent = [], start = "top 85%", stagger = 0.06, immediate = false,
}: {
  text: string; as?: ElementType; className?: string; accent?: string[]; start?: string; stagger?: number; immediate?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as ElementType;
  useGSAP(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = ref.current!.querySelectorAll(".rw-word");
    const vars = { yPercent: 115, duration: 0.9, ease: "power3.out", stagger };
    if (immediate) gsap.from(words, { ...vars, delay: 0.2 });
    else gsap.from(words, { ...vars, scrollTrigger: { trigger: ref.current, start } });
  }, { scope: ref });
  const clean = (w: string) => w.replace(/[.,?]/g, "").toLowerCase();
  const words = text.split(" ");
  return (
    <Tag className={className} ref={ref as never} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="rw-mask" aria-hidden="true">
            <span className={`rw-word${accent.includes(clean(w)) ? " it" : ""}`}>{w}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}
