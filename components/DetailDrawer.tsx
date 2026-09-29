"use client";
import { useCallback, useEffect, useState } from "react";
import { CONTACT, gmailLink, invites, tracks } from "@/lib/content";

type Open = { kind: "track" | "invite"; id: string } | null;

function parse(hash: string): Open {
  if (hash.startsWith("#track/")) return { kind: "track", id: hash.slice(7) };
  if (hash.startsWith("#invite/")) return { kind: "invite", id: hash.slice(8) };
  return null;
}

function lock(on: boolean) {
  document.documentElement.classList.toggle("is-locked", on);
  window.dispatchEvent(new CustomEvent("gsc:lock", { detail: on }));
}

/** Frame the brief image at its own shape; keep portrait photos from getting too tall. */
function briefStyle(aspect?: string): React.CSSProperties | undefined {
  if (!aspect) return undefined;
  const [w, h] = aspect.split("/").map((n) => parseFloat(n));
  const portrait = w && h ? w / h < 1 : false;
  return portrait ? { aspectRatio: aspect, maxWidth: "min(100%, 560px)" } : { aspectRatio: aspect };
}

export default function DetailDrawer() {
  const [open, setOpen] = useState<Open>(null);

  useEffect(() => {
    const sync = () => setOpen(parse(location.hash));
    sync();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#track/'],a[href^='#invite/']");
      if (!a) return;
      e.preventDefault();
      const hash = a.getAttribute("href")!;
      try { history.pushState({}, "", hash); } catch { location.hash = hash; }
      setOpen(parse(hash));
    };
    window.addEventListener("popstate", sync);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", sync);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const close = useCallback(() => {
    const back = open?.kind === "invite" ? "#partners" : "#tracks";
    try { history.pushState({}, "", back); } catch { location.hash = back; }
    setOpen(null);
  }, [open]);

  useEffect(() => {
    lock(!!open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const track = open?.kind === "track" ? tracks.find((t) => t.id === open.id) : undefined;
  const invite = open?.kind === "invite" ? invites.find((i) => i.id === open.id) : undefined;
  const item = track ?? invite;

  return (
    <aside className={`detail overlay${item ? " open" : ""}`} aria-hidden={!item} data-lenis-prevent onClick={(e) => e.target === e.currentTarget && close()}>
      {item && (
        <div className="detail-inner">
          <div className="overlay-head">
            <span className="label">{invite ? invite.label : "Track brief"}</span>
            <button className="close" type="button" onClick={close}>close ×</button>
          </div>
          <div className="detail-layout">
            <div>
              <p className="label accent">{item.kicker}</p>
              <h2>{item.title}</h2>
              <p className="detail-lede">{item.lede}</p>
              {track && (
                <figure className="detail-image" style={briefStyle(track.briefAspect)}>
                  <img src={track.briefImage ?? track.image} alt="Cars24 operating environment" />
                </figure>
              )}
            </div>
            <div className="detail-side">
              <h3>{track ? "What we are looking for" : "What you can expect"}</h3>
              {track ? (
                <p>{track.body}</p>
              ) : (
                <ul className="points">
                  {invite!.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
              <h3>{track ? "Good signals" : "Programme details"}</h3>
              <p>{item.signals}</p>
              {track && (
                <>
                  <h3>Why it matters</h3>
                  <p className="track-why">{track.why}</p>
                  <ul className="track-stats">
                    {track.stats.map(([v, l]) => (
                      <li key={v}><strong>{v}</strong><span>{l}</span></li>
                    ))}
                  </ul>
                  <h3>What startups would build</h3>
                  <ul className="chips">
                    {track.build.map((b) => <li key={b}>{b}</li>)}
                  </ul>
                </>
              )}
              {invite && (
                <>
                  <h3>Reach out</h3>
                  <p>
                    <a className="contact-link" href={gmailLink(invite.label)} target="_blank" rel="noopener noreferrer">{CONTACT}</a>
                  </p>
                </>
              )}
              {invite && (
                <a className="btn" href={gmailLink(invite.label)} target="_blank" rel="noopener noreferrer">
                  {invite.action} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
