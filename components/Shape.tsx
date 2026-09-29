import { ShapeName, shapePath } from "@/lib/trapezoid";

// Global SVG clip paths so any element can be masked into a brand shape via
// `clip-path: url(#trap-<name>)`.
export function ShapeDefs() {
  const names: ShapeName[] = ["base", "soft", "motion", "expressive"];
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
      <defs>
        {names.map((n) => (
          <clipPath id={`trap-${n}`} clipPathUnits="objectBoundingBox" key={n}>
            <path d={shapePath(n)} />
          </clipPath>
        ))}
        <linearGradient id="trap-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#4736FE" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// A decorative filled brand shape.
export default function Shape({ name = "base", className = "", speed }: { name?: ShapeName; className?: string; speed?: number }) {
  return (
    <svg className={`shape ${className}`} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true" data-speed={speed}>
      <path d={shapePath(name)} fill="url(#trap-fill)" />
    </svg>
  );
}
