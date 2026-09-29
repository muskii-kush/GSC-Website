"use client";
import { useEffect, useState } from "react";
import { APPLICATIONS_CLOSE, APPLICATIONS_OPEN } from "@/lib/content";

const OPEN = new Date(APPLICATIONS_OPEN).getTime();
const CLOSE = new Date(APPLICATIONS_CLOSE).getTime();

export default function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const phase = now === null || now < OPEN ? "open" : now < CLOSE ? "close" : "closed";
  const target = phase === "open" ? OPEN : CLOSE;
  const left = now === null ? 0 : Math.max(0, target - now);
  const parts = [
    [String(Math.floor(left / 86400000)).padStart(3, "0"), "Days"],
    [String(Math.floor((left % 86400000) / 3600000)).padStart(2, "0"), "Hours"],
    [String(Math.floor((left % 3600000) / 60000)).padStart(2, "0"), "Minutes"],
    [String(Math.floor((left % 60000) / 1000)).padStart(2, "0"), "Seconds"],
  ];

  if (phase === "closed") return <p className="countdown-label">Applications are closed</p>;
  return (
    <div className="countdown-wrap">
      <p className="countdown-label">
        <span className="live-dot" aria-hidden="true" />
        {phase === "open" ? "Applications open in" : "Applications close in"}
      </p>
      <div className="countdown" role="timer" aria-label={phase === "open" ? "Countdown to applications opening on 1 October 2026" : "Countdown to applications closing on 31 October 2026"}>
        {parts.map(([v, l]) => (
          <div className="countdown-item" key={l}>
            <strong suppressHydrationWarning>{now === null ? "--" : v}</strong>
            <span>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
