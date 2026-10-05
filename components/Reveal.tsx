import { ElementType, Fragment } from "react";

// Heading with accent words in the brand lilac. Static: no per-word animation in this version.
export default function Reveal({
  text, as = "h2", className = "", accent = [],
}: {
  text: string; as?: ElementType; className?: string; accent?: string[];
  start?: string; stagger?: number; immediate?: boolean; effect?: "blur" | "slide";
}) {
  const Tag = as as ElementType;
  const clean = (w: string) => w.replace(/[.,?]/g, "").toLowerCase();
  const words = text.split(" ");
  return (
    <Tag className={`${className} rise`}>
      {words.map((w, i) => (
        <Fragment key={i}>
          {accent.includes(clean(w)) ? <span className="rw-word it">{w}</span> : w}
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}
