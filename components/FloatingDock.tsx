"use client";
import { useEffect, useState } from "react";
import { APPLICATIONS_CLOSE, APPLICATIONS_OPEN, CONTACT, gmailLink } from "@/lib/content";

/**
 * A small glass bar pinned to the bottom of the screen with the two ways in:
 * register, or email the team. It slides up once the hero has scrolled away and
 * steps aside again at the closing section, which carries the same buttons.
 */
export default function FloatingDock() {
  const [pastHero, setPastHero] = useState(false);
  const [atClosing, setAtClosing] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".invitation");
    const closing = document.querySelector(".s-closing");
    const update = () => {
      const vh = window.innerHeight;
      setPastHero(!!hero && hero.getBoundingClientRect().bottom < vh * 0.25);
      setAtClosing(!!closing && closing.getBoundingClientRect().top < vh * 0.85);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Phase-aware line: works before, during and after the application window.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const open = new Date(APPLICATIONS_OPEN).getTime();
  const close = new Date(APPLICATIONS_CLOSE).getTime();
  const headline = now === null || now < open
    ? "Applications open 9 October"
    : now < close ? "Applications close 10 November" : "Applications are closed";

  const shown = pastHero && !atClosing;
  return (
    <div className={`dock${shown ? " is-shown" : ""}`} aria-hidden={!shown}>
      <div className="dock-copy">
        <strong>{headline}</strong>
        <span>Register now or email the team</span>
      </div>
      <a className="dock-btn dock-primary" href="#register" data-register tabIndex={shown ? 0 : -1}>
        register <span aria-hidden="true">→</span>
      </a>
      <a
        className="dock-btn dock-icon"
        href={gmailLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Email ${CONTACT}`}
        tabIndex={shown ? 0 : -1}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M4 6h16v12H4z M4 7l8 6 8-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
