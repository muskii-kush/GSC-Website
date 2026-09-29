"use client";
import { useEffect, useRef, useState } from "react";

/**
 * A circuit laid over the "who will be joining" grid once the deck has dealt out:
 * mint traces bridge the gaps between neighbouring cards, and pulses of light run
 * along the traces and around each card's border. Drawn from the cards' layout
 * boxes (offsetLeft/Top), so GSAP transforms during the deal never skew it.
 */
type Box = { x: number; y: number; w: number; h: number };
type Link = { d: string; pads: [number, number][] };

const R = 32; // matches .room-card border-radius

function roundedRect({ x, y, w, h }: Box) {
  const r = Math.min(R, w / 2, h / 2);
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

// Stepped traces to the right-hand neighbour and to the card below, with a solder pad at each end.
function buildLinks(boxes: Box[], cols: number): Link[] {
  const links: Link[] = [];
  boxes.forEach((a, i) => {
    const right = boxes[i + 1];
    if (right && (i + 1) % cols !== 0) {
      const y1 = a.y + a.h * 0.34, y2 = right.y + right.h * 0.58;
      const gx = (a.x + a.w + right.x) / 2;
      links.push({ d: `M${a.x + a.w},${y1} H${gx} V${y2} H${right.x}`, pads: [[a.x + a.w, y1], [right.x, y2]] });
    }
    const below = boxes[i + cols];
    if (below) {
      const x1 = a.x + a.w * (i % 2 ? 0.3 : 0.66), x2 = below.x + below.w * (i % 2 ? 0.55 : 0.4);
      const gy = (a.y + a.h + below.y) / 2;
      links.push({ d: `M${x1},${a.y + a.h} V${gy} H${x2} V${below.y}`, pads: [[x1, a.y + a.h], [x2, below.y]] });
    }
  });
  return links;
}

export default function CircuitOverlay({ gridSelector }: { gridSelector: string }) {
  const host = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0, x: 0, y: 0 });
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const svg = host.current;
    const grid = svg?.parentElement?.querySelector<HTMLElement>(gridSelector);
    if (!svg || !grid) return undefined;
    const measure = () => {
      const cards = Array.from(grid.children) as HTMLElement[];
      const b = cards.map((c) => ({ x: c.offsetLeft, y: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight }));
      const firstRowTop = b[0]?.y ?? 0;
      setCols(Math.max(1, b.filter((v) => v.y === firstRowTop).length));
      setBoxes(b);
      // The grid is centred inside the host, so sit the SVG exactly on top of it.
      setSize({ w: grid.clientWidth, h: grid.clientHeight, x: grid.offsetLeft, y: grid.offsetTop });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [gridSelector]);

  const links = buildLinks(boxes, cols);

  return (
    <svg
      ref={host}
      className="circuit"
      viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
      width={size.w}
      height={size.h}
      style={{ left: size.x, top: size.y }}
      aria-hidden="true"
    >
      {boxes.map((b, i) => (
        <g key={`b${i}`}>
          <path className="circuit-edge" d={roundedRect(b)} pathLength={100} />
          <path className="circuit-spark circuit-spark-edge" d={roundedRect(b)} pathLength={100} style={{ animationDelay: `${i * -1.1}s` }} />
        </g>
      ))}
      {links.map((l, i) => (
        <g key={`l${i}`}>
          <path className="circuit-trace" d={l.d} pathLength={100} />
          <path className="circuit-spark circuit-spark-trace" d={l.d} pathLength={100} style={{ animationDelay: `${i * 0.45}s` }} />
          {l.pads.map(([x, y], j) => (
            <circle key={j} className="circuit-pad" cx={x} cy={y} r={3.2} style={{ animationDelay: `${i * 0.45 + j * 0.9}s` }} />
          ))}
        </g>
      ))}
    </svg>
  );
}
