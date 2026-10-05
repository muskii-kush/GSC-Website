"use client";
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";

export default function Nav({ base = "", page }: { base?: string; page?: "more" | "joining" }) {
  // On the "More" page the section links point back to the main page.
  const h = (hash: string) => `${base}${hash}`;
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
  const cls = (id: string) => (!base && current === id ? "is-current" : undefined);
  // On phones the menu scrolls sideways: keep the current section's link in view.
  const links = useRef<HTMLElement>(null);
  useEffect(() => {
    const bar = links.current;
    const el = bar?.querySelector<HTMLElement>(".is-current");
    if (!bar || !el || bar.scrollWidth <= bar.clientWidth) return;
    bar.scrollTo({ left: Math.max(0, el.offsetLeft - 16), behavior: "smooth" });
  }, [current]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="logo-bar">
        <a href={h("#top")} className="lb-inner" aria-label="Grand Startup Challenge home">
          <img src={asset("/media/dpiit.webp")} alt="DPIIT Startup India" className="lb-dpiit" />
          <img src={asset("/media/cars24.webp")} alt="Cars24" className="lb-cars24" />
          <img src={asset("/media/spf.webp")} alt="Startup Policy Forum" className="lb-spf" />
        </a>
      </div>
      <div className="link-bar">
        <div className="link-inner">
          <nav className="nav-links" aria-label="Main navigation" ref={links}>
            <a href={h("#top")} className={cls("#top")}>Home</a>
            <a href={h("#challenge")} className={cls("#challenge")}><span className="nl-full">About the event</span><span className="nl-short">About</span></a>
            <a href={h("#tracks")} className={cls("#tracks")}>Tracks</a>
            <a href={h("#timeline")} className={cls("#timeline")}>Timeline</a>
            <a href={h("#scoring")}>Eligibility</a>
            <a href={h("#partners")} className={cls("#partners")}>Partners</a>
            <a href={h("#faq")} className={cls("#faq")}>FAQ</a>
            <a href="/joining" className={page === "joining" ? "is-current" : undefined}><span className="nl-full">Who&rsquo;s joining</span><span className="nl-short">Joining</span></a>
          </nav>
          <a className="btn btn-xs" href="#register" data-register>Register <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </header>
  );
}
