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
      <div className="nav-inner">
        <a className="brand" href="#top" aria-label="Grand Startup Challenge home">
          <span className="nav-logos">
            <img src="/media/dpiit.webp" alt="DPIIT Startup India" className="nl-dpiit" />
            <span className="nl-div" aria-hidden="true" />
            <img src="/media/cars24.webp" alt="Cars24" className="nl-cars24" />
            <span className="nl-div" aria-hidden="true" />
            <img src="/media/spf.webp" alt="Startup Policy Forum" className="nl-spf" />
          </span>
          <span className="brand-name">Grand Startup Challenge</span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#challenge">about the event</a>
          <a href="#tracks">tracks</a>
          <a href="#partners">partner / investor</a>
        </nav>
        <a className="btn btn-sm" href="#register" data-register>register <span aria-hidden="true">→</span></a>
      </div>
    </header>
  );
}
