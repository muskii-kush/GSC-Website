"use client";
import { useEffect, useState } from "react";

/** Cycles through a few words in place, e.g. "let's build / pitch / scale …". */
export default function RotatingWord({ words, interval = 2200 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);
  return (
    <span className="rot" aria-live="off">
      {/* The current word sets the width, so there is no gap after shorter words. */}
      <span className="rot-sizer" aria-hidden="true">{words[i]}</span>
      {words.map((w, n) => (
        <span key={w} className={`rot-word${n === i ? " is-on" : n === (i + words.length - 1) % words.length ? " is-out" : ""}`} aria-hidden={n !== i}>
          {w}
        </span>
      ))}
    </span>
  );
}
