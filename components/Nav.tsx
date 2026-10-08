"use client";
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { CONTACT, gmailLink } from "@/lib/content";

export default function Nav({ base = "", page }: { base?: string; page?: "more" | "joining" }) {
  // On the "More" page the section links point back to the main page.
  const h = (hash: string) => `${base}${hash}`;
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Lock the page behind the open menu; Esc closes it.
  useEffect(() => {
    document.documentElement.classList.toggle("is-locked", menuOpen);
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
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
  const cls = (id: string) => (!base && current === id ? "is-current" : undefined);
  const links = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="logo-bar">
        <a href={h("#top")} className="lb-inner" aria-label="Grand Startup Challenge home">
          <span className="lb-left">
            <img src={asset("/media/dpiit.webp")} alt="DPIIT Startup India" className="lb-dpiit" />
            <img src={asset("/media/meity.svg")} alt="MeitY Startup Hub" className="lb-meity" />
          </span>
          <img src={asset("/media/cars24.webp")} alt="Cars24" className="lb-cars24" />
          <img src={asset("/media/spf.webp")} alt="Startup Policy Forum" className="lb-spf" />
        </a>
      </div>
      <div className="link-bar">
        <div className="link-inner">
          <button
            type="button"
            className={`menu-btn${menuOpen ? " is-open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="side-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span /><span /><span />
          </button>
          <a className="btn btn-xs" href="#register" data-register>Register <span aria-hidden="true">→</span></a>
        </div>
      </div>

    </header>
      {/* Side menu: slides in from the left */}
      <div className={`menu-scrim${menuOpen ? " is-open" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <nav
        id="side-menu"
        className={`side-menu${menuOpen ? " is-open" : ""}`}
        aria-label="Main navigation"
        aria-hidden={!menuOpen}
        ref={links}
        onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setMenuOpen(false); }}
      >
        <p className="side-menu-label">Menu</p>
        <a href={h("#top")} className={cls("#top")}>Home</a>
        <a href={h("#challenge")} className={cls("#challenge")}>About the event</a>
        <a href={h("#tracks")} className={cls("#tracks")}>Tracks</a>
        <a href={h("#timeline")} className={cls("#timeline")}>Timeline</a>
        <a href={h("#scoring")}>Eligibility</a>
        <a href={h("#partners")} className={cls("#partners")}>Partners</a>
        <a href={h("#faq")} className={cls("#faq")}>FAQ</a>
        <a href="/joining" className={page === "joining" ? "is-current" : undefined}>The room</a>
        <div className="side-menu-foot">
          <a className="btn" href="#register" data-register>Register now <span aria-hidden="true">→</span></a>
          <a className="side-menu-mail" href={gmailLink()} target="_blank" rel="noopener noreferrer">{CONTACT}</a>
        </div>
      </nav>
    </>
  );
}
