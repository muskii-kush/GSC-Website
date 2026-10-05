"use client";
import { useEffect, useRef } from "react";

/**
 * Home banner background: a field of soft mint specks drifting slowly through a violet
 * glow, like out-of-focus lights. Drawn small and blurred by CSS (the look is meant to be
 * soft), only while on screen; a still frame for people who prefer reduced motion.
 */
type Dot = { x: number; y: number; r: number; a: number; vx: number; vy: number; tw: number };

export default function StarField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SCALE = 0.5;
    let w = 0, h = 0, dots: Dot[] = [], raf = 0, visible = false, last = 0;

    const seed = () => {
      // More dots towards the right, where the glow is, fading out to the left.
      const n = Math.round((w * h) / 520);
      dots = Array.from({ length: n }, () => {
        const x = Math.pow(Math.random(), 0.55) * w;
        return {
          x, y: Math.random() * h,
          r: 1.1 + Math.random() * 2.2,
          a: 0.25 + Math.random() * 0.6,
          vx: 3 + Math.random() * 6, vy: -1.5 - Math.random() * 3,
          tw: Math.random() * Math.PI * 2,
        };
      });
    };

    const size = () => {
      w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      canvas.width = w; canvas.height = h;
      seed();
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.x > w + 4) d.x = -4;
        if (d.y < -4) d.y = h + 4;
        // fade dots on the dark left side
        const fade = Math.min(1, Math.max(0, (d.x / w - 0.12) / 0.45));
        const twinkle = 0.7 + 0.3 * Math.sin(t * 1.2 + d.tw);
        ctx.globalAlpha = d.a * fade * twinkle;
        ctx.fillStyle = "#9FF5D0";
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      if (now - last > 33) { draw(now / 1000, dt); last = now; }
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (reduce) { draw(0, 0); return; } if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };

    size(); draw(0, 0);
    const ro = new ResizeObserver(() => { size(); draw(0, 0); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); });
    io.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, []);

  return <canvas ref={ref} className={`starfield ${className}`} aria-hidden="true" />;
}
