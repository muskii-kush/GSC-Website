"use client";
import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
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
          <img src="/media/dpiit.webp" alt="DPIIT Startup India" className="lb-dpiit" />
          <img src="/media/cars24.webp" alt="Cars24" className="lb-cars24" />
          <img src="/media/spf.webp" alt="Startup Policy Forum" className="lb-spf" />
        </a>
      </div>
      <div className="link-bar">
        <div className="link-inner">
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#top">home</a>
            <a href="#challenge">about the event</a>
            <a href="#tracks">tracks</a>
            <a href="#timeline">key dates</a>
            <a href="#partners">partner / investor</a>
          </nav>
          <a className="btn btn-xs" href="#register" data-register>register <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </header>
  );
}
