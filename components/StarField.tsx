"use client";
import { useEffect, useRef } from "react";

/**
 * Home banner background: a field of soft mint specks drifting slowly through a violet
 * glow, like out-of-focus lights. Drawn at full resolution (the specks should look
 * crisp), only while on screen; a still frame for people who prefer reduced motion.
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
    let w = 0, h = 0, dots: Dot[] = [], raf = 0, visible = false, last = 0;

    // One speck drawn once at high resolution: crisp centre, soft mint glow.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sc = sprite.getContext("2d")!;
    const g = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(235,255,246,1)");
    g.addColorStop(0.16, "rgba(200,255,230,1)");
    g.addColorStop(0.26, "rgba(99,255,177,.45)");
    g.addColorStop(0.55, "rgba(99,255,177,.08)");
    g.addColorStop(1, "rgba(99,255,177,0)");
    sc.fillStyle = g; sc.fillRect(0, 0, 64, 64);

    const seed = () => {
      // More dots towards the right, where the glow is, fading out to the left.
      const n = Math.min(900, Math.round((w * h) / 1500));
      dots = Array.from({ length: n }, () => {
        const x = Math.pow(Math.random(), 0.55) * w;
        return {
          x, y: Math.random() * h,
          r: 1.1 + Math.pow(Math.random(), 1.6) * 2.2,
          a: 0.25 + Math.random() * 0.6,
          vx: 6 + Math.random() * 12, vy: -3 - Math.random() * 6,
          tw: Math.random() * Math.PI * 2,
        };
      });
    };

    // Full resolution (up to 2x on retina) so every speck is crisp.
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, canvas.clientWidth);
      h = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        // A pre-rendered speck (bright core, smooth falloff), scaled per dot.
        ctx.globalAlpha = d.a * fade * twinkle;
        const size = d.r * 5;
        ctx.drawImage(sprite, d.x - size / 2, d.y - size / 2, size, size);
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
