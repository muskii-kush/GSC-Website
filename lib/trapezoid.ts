// CARS24 primary brand shape: a trapezoid with soft corners. Corner radius is
// locked to one-tenth of the shape, per the brand-shapes guideline.

type Pt = [number, number];

export function roundedPolygon(points: Pt[], radius: number): string {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const toward = (a: Pt, b: Pt): Pt => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      const t = Math.min(radius / len, 0.5);
      return [a[0] + dx * t, a[1] + dy * t];
    };
    const a = toward(p, prev);
    const b = toward(p, next);
    const f = (v: number) => +v.toFixed(4);
    d += `${i === 0 ? "M" : "L"}${f(a[0])},${f(a[1])} Q${f(p[0])},${f(p[1])} ${f(b[0])},${f(b[1])} `;
  }
  return d + "Z";
}

// Shape variants from the trapezoid system, in a 0–1 unit box.
export const SHAPES = {
  // Base form: UI / social components
  base: [[0.12, 0], [0.88, 0], [1, 1], [0, 1]] as Pt[],
  // Softened geometry: cards, reports
  soft: [[0, 0], [1, 0.08], [1, 0.92], [0, 1]] as Pt[],
  // Applied motion: campaign layouts
  motion: [[0.07, 0.14], [1, 0], [0.93, 0.86], [0, 1]] as Pt[],
  // Expressive variation: marketing, storytelling
  expressive: [[0, 0], [0.86, 0], [1, 1], [0.12, 1]] as Pt[],
};

export type ShapeName = keyof typeof SHAPES;

export const shapePath = (name: ShapeName, radius = 0.1) => roundedPolygon(SHAPES[name], radius);
