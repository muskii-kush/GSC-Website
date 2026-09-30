"use client";
import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  // Which section the reader is in, so the menu shows where they are in the story.
  const [current, setCurrent] = useState("#top");
  useEffect(() => {
    const ids = ["#challenge", "#tracks", "#timeline", "#partners", "#faq"];
    const on = () => {
      let at = "#top";
      for (const id of ids) {
        const el = document.querySelector(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) at = id;
      }
      setCurrent(at);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const cls = (id: string) => (current === id ? "is-current" : undefined);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="logo-bar">
        <a href="#top" className="lb-inner" aria-label="Grand Startup Challenge home">
          <img src={asset("/media/dpiit.webp")} alt="DPIIT Startup India" className="lb-dpiit" />
          <img src={asset("/media/cars24.webp")} alt="Cars24" className="lb-cars24" />
          <img src={asset("/media/spf.webp")} alt="Startup Policy Forum" className="lb-spf" />
        </a>
      </div>
      <div className="link-bar">
        <div className="link-inner">
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#top" className={cls("#top")}>home</a>
            <a href="#challenge" className={cls("#challenge")}>about the event</a>
            <a href="#tracks" className={cls("#tracks")}>tracks</a>
            <a href="#timeline" className={cls("#timeline")}>how it works</a>
            <a href="#scoring">eligibility</a>
            <a href="#partners" className={cls("#partners")}>partners</a>
            <a href="#faq" className={cls("#faq")}>faq</a>
          </nav>
          <a className="btn btn-xs" href="#register" data-register>register <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </header>
  );
}
