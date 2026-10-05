"use client";
import { useEffect, useRef } from "react";

/**
 * Aurora glow for Version B: soft clouds of the brand blue, lavender and mint that
 * drift and blend slowly, under a fine film grain. One visual, reused section by
 * section in a different crop (a band, a wash, a glow rising from below).
 *
 * Drawn small and scaled up (the clouds are blurry anyway), only while on screen;
 * a still frame for people who prefer reduced motion.
 */
type Variant = "full" | "band" | "glow";

type Blob = { color: [number, number, number]; r: number; cx: number; cy: number; ax: number; ay: number; sx: number; sy: number; ph: number; a: number };

const BLUE: [number, number, number] = [71, 54, 254];
const LAV: [number, number, number] = [143, 132, 255];
const MINT: [number, number, number] = [99, 255, 177];
const SKY: [number, number, number] = [91, 140, 255];
const DEEP: [number, number, number] = [42, 32, 152];

function blobsFor(variant: Variant): Blob[] {
  // Positions are fractions of the canvas; ax/ay how far each cloud wanders.
  if (variant === "band") return [
    { color: BLUE, r: 0.55, cx: 0.2, cy: 0.5, ax: 0.18, ay: 0.12, sx: 0.07, sy: 0.05, ph: 0, a: 0.85 },
    { color: MINT, r: 0.4, cx: 0.55, cy: 0.5, ax: 0.22, ay: 0.15, sx: 0.05, sy: 0.08, ph: 2, a: 0.55 },
    { color: LAV, r: 0.5, cx: 0.85, cy: 0.5, ax: 0.15, ay: 0.12, sx: 0.06, sy: 0.04, ph: 4, a: 0.75 },
  ];
  if (variant === "glow") return [
    { color: BLUE, r: 0.65, cx: 0.3, cy: 1.0, ax: 0.2, ay: 0.08, sx: 0.05, sy: 0.06, ph: 1, a: 0.9 },
    { color: LAV, r: 0.55, cx: 0.72, cy: 1.05, ax: 0.18, ay: 0.08, sx: 0.06, sy: 0.05, ph: 3, a: 0.75 },
    { color: MINT, r: 0.35, cx: 0.5, cy: 0.95, ax: 0.25, ay: 0.06, sx: 0.04, sy: 0.07, ph: 5, a: 0.5 },
  ];
  return [
    { color: BLUE, r: 0.7, cx: 0.25, cy: 0.3, ax: 0.18, ay: 0.14, sx: 0.045, sy: 0.035, ph: 0, a: 0.95 },
    { color: LAV, r: 0.55, cx: 0.8, cy: 0.35, ax: 0.15, ay: 0.18, sx: 0.035, sy: 0.05, ph: 2.1, a: 0.7 },
    { color: MINT, r: 0.42, cx: 0.55, cy: 0.85, ax: 0.25, ay: 0.12, sx: 0.05, sy: 0.04, ph: 4.2, a: 0.55 },
    { color: SKY, r: 0.45, cx: 0.1, cy: 0.9, ax: 0.12, ay: 0.1, sx: 0.04, sy: 0.06, ph: 1.3, a: 0.6 },
    { color: DEEP, r: 0.6, cx: 0.9, cy: 0.95, ax: 0.1, ay: 0.08, sx: 0.03, sy: 0.04, ph: 3.3, a: 0.8 },
  ];
}

export default function Aurora({ variant = "full", className = "" }: { variant?: Variant; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blobs = blobsFor(variant);
    const SCALE = 0.25; // draw at a quarter size; CSS scales it up (it is all soft light)
    let w = 0, h = 0, raf = 0, visible = false, last = 0;

    const size = () => {
      w = Math.max(1, Math.round(canvas.clientWidth * SCALE));
      h = Math.max(1, Math.round(canvas.clientHeight * SCALE));
      canvas.width = w; canvas.height = h;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const m = Math.max(w, h);
      for (const b of blobs) {
        const x = (b.cx + Math.sin(t * b.sx * 2 + b.ph) * b.ax) * w;
        const y = (b.cy + Math.cos(t * b.sy * 2 + b.ph * 1.3) * b.ay) * h;
        const r = b.r * m * (1 + Math.sin(t * 0.07 + b.ph) * 0.08);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const [cr, cg, cb] = b.color;
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${b.a})`);
        g.addColorStop(0.45, `rgba(${cr},${cg},${cb},${b.a * 0.45})`);
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (now - last > 40) { draw(now / 1000); last = now; }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (reduce) { draw(20); return; }
      if (!raf) raf = requestAnimationFrame(loop);
    };

    size(); draw(20);
    const ro = new ResizeObserver(() => { size(); draw(performance.now() / 1000); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { rootMargin: "100px" });
    io.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [variant]);

  return (
    <div className={`aurora aurora-${variant} ${className}`} aria-hidden="true">
      <canvas ref={ref} />
    </div>
  );
}
