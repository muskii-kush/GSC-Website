"use client";
import { useRef, useState } from "react";

export default function Film() {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const toggle = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) v.play().catch(() => {});
  };
  return (
    <section className="s-film" aria-label="Grand Startup Challenge motion intro">
      <div className="film-stage">
        <div className="film-frame" data-tilt>
          <video ref={video} autoPlay muted loop playsInline preload="metadata" poster="/media/hero-poster.jpg" aria-label="Grand Startup Challenge motion intro">
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
          <button className="sound-toggle" type="button" onClick={toggle} aria-label={muted ? "Turn on video sound" : "Turn off video sound"}>
            {muted ? "sound on" : "sound off"}
          </button>
        </div>
      </div>
    </section>
  );
}
