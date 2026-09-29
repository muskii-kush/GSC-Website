"use client";
import { useEffect, useState } from "react";
import { registrationMarkup } from "@/lib/registration-markup";
import { initRegistration } from "@/lib/registration";
import { STATIC_SITE } from "@/lib/asset";
import { CONTACT, gmailLink } from "@/lib/content";

export default function Registration() {
  return STATIC_SITE ? <RegistrationSoon /> : <RegistrationPanel />;
}

function RegistrationPanel() {
  useEffect(() => { initRegistration(); }, []);
  return (
    <aside
      className="registration overlay"
      id="registration"
      aria-hidden="true"
      data-lenis-prevent
      dangerouslySetInnerHTML={{ __html: registrationMarkup }}
    />
  );
}

// Static hosting (GitHub Pages) has no backend, so the application form can't
// run there. Register opens this panel instead.
function RegistrationSoon() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lock = (on: boolean) => {
      document.documentElement.classList.toggle("is-locked", on);
      window.dispatchEvent(new CustomEvent("gsc:lock", { detail: on }));
    };
    const onClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-register]")) return;
      e.preventDefault();
      setOpen(true);
      lock(true);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); lock(false); } };
    const onClose = () => lock(false);
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("gsc:register-close", onClose);
    if (location.hash === "#register") { setOpen(true); lock(true); }
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("gsc:register-close", onClose);
    };
  }, []);

  const close = () => {
    setOpen(false);
    window.dispatchEvent(new Event("gsc:register-close"));
  };

  return (
    <aside
      className={`registration overlay${open ? " open" : ""}`}
      id="registration"
      aria-hidden={!open}
      data-lenis-prevent
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="registration-inner">
        <div className="registration-head">
          <span className="eyebrow">Registration</span>
          <button className="close" type="button" onClick={close}>Close ×</button>
        </div>
        <h2>Registration opens soon</h2>
        <p className="registration-lede">
          The online application for the Grand Startup Challenge will open here shortly. For questions in the meantime,
          write to us.
        </p>
        <a className="button primary" href={gmailLink("Grand Startup Challenge registration")} target="_blank" rel="noopener noreferrer">
          Email {CONTACT} ↗
        </a>
      </div>
    </aside>
  );
}
