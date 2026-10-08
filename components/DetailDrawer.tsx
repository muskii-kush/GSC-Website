"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CONTACT, gmailLink, invites, scoring, tracks } from "@/lib/content";

// Track ids on the site mapped to the track answer in the application form.
const TRACK_CHOICE: Record<string, string> = {
  fintech: "Fintech and Lending",
  mobility: "Mobility and Road Safety",
  logistics: "Logistics, Fleet and Supply Chain",
  "sovereign-ai": "Sovereign AI",
};

type Open = { kind: "track" | "invite" | "scoring"; id: string } | null;

function parse(hash: string): Open {
  if (hash.startsWith("#track/")) return { kind: "track", id: hash.slice(7) };
  if (hash.startsWith("#invite/")) return { kind: "invite", id: hash.slice(8) };
  if (hash === "#scoring") return { kind: "scoring", id: "" };
  return null;
}

function lock(on: boolean) {
  // Leave the page locked if registration has just opened on top (the rubric's register button).
  if (!on && document.querySelector(".registration.open")) return;
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
  const [tab, setTab] = useState<"gates" | "screening">("gates");
  // Where the reader came from, so closing the rubric puts the address back there.
  const origin = useRef("#timeline");

  useEffect(() => {
    const sync = () => setOpen(parse(location.hash));
    sync();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#track/'],a[href^='#invite/'],a[href='#scoring']");
      if (!a) return;
      e.preventDefault();
      const hash = a.getAttribute("href")!;
      if (hash === "#scoring") {
        const from = a.closest(".registration") ? "register" : a.closest<HTMLElement>("section[id]")?.id;
        origin.current = from ? `#${from}` : "#top";
        setTab("gates");
      }
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
    const back = open?.kind === "invite" ? "#partners" : open?.kind === "scoring" ? origin.current : "#tracks";
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
  const isScoring = open?.kind === "scoring";
  const shown = !!item || isScoring;

  return (
    <aside className={`detail overlay${shown ? " open" : ""}`} aria-hidden={!shown} data-lenis-prevent onClick={(e) => e.target === e.currentTarget && close()}>
      {isScoring && (
        <div className="detail-inner">
          <div className="overlay-head detail-head">
            <button className="close" type="button" onClick={close}>× close</button>
            <span className="label">{scoring.label}</span>
          </div>
          <div className="rubric">
            <h2>{scoring.title}</h2>
            <p className="detail-lede">{scoring.lede}</p>
            <div className="rubric-tabs" role="tablist" aria-label="Scoring stages">
              {(["gates", "screening"] as const).map((k, i) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  className={`rubric-tab${tab === k ? " is-active" : ""}`}
                  onClick={() => setTab(k)}
                >
                  <span className="rubric-tab-no">Stage {i + 1}</span>
                  {scoring[k].tab}
                </button>
              ))}
            </div>
            {tab === "gates" ? (
              <div className="rubric-panel" role="tabpanel">
                <h3 className="rubric-heading">{scoring.gates.heading}</h3>
                <p className="rubric-intro">{scoring.gates.intro}</p>
                <ol className="rubric-gates">
                  {scoring.gates.items.map((g, i) => (
                    <li key={g.title}>
                      <span className="rubric-gate-no">{i + 1}</span>
                      <div>
                        <strong>{g.title}</strong>
                        <p>{g.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="rubric-note">{scoring.gates.note}</p>
              </div>
            ) : (
              <div className="rubric-panel" role="tabpanel">
                <h3 className="rubric-heading">{scoring.screening.heading}</h3>
                <p className="rubric-intro">{scoring.screening.intro}</p>
                <div className="rubric-criteria">
                  {scoring.screening.criteria.map((c) => (
                    <article className="rubric-criterion" key={c.title}>
                      <header>
                        <h4>{c.title}</h4>
                        <span className="rubric-weight">{c.weight}</span>
                      </header>
                      <p className="rubric-question">{c.question}</p>
                      <p className="rubric-reads"><span>What we read</span>{c.reads}</p>
                      <p className="rubric-look"><span>What we look for</span>{c.look}</p>
                    </article>
                  ))}
                </div>
                <p className="rubric-note">{scoring.screening.note}</p>
              </div>
            )}
            <div className="rubric-foot">
              <a className="btn" href="#register" data-register onClick={() => setOpen(null)}>register now <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      )}
      {item && (
        <div className="detail-inner">
          {/* Close sits top left, and the bar stays pinned while the brief scrolls */}
          <div className="overlay-head detail-head">
            <button className="close" type="button" onClick={close}>× close</button>
            <span className="label">{invite ? invite.label : "Track brief"}</span>
          </div>
          <div className="detail-layout">
            <div>
              <p className="label accent">{item.kicker}</p>
              <h2>{item.title}</h2>
              <p className="detail-lede">{item.lede}</p>
              {track && (
                <figure className="detail-image" style={briefStyle(track.briefAspect)}>
                  <img src={track.briefImage ?? track.image} alt="Operating environment for this track" />
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
                  <h3>Problems your startup could be solving</h3>
                  <p className="chips-lede">Common problem statements in this track. If your startup already works on one of these, or on something close to it, this track is for you.</p>
                  <ol className="ps-list">
                    {track.build.map((b, i) => {
                      const cut = b.indexOf(": ");
                      return (
                        <li key={b}>
                          <span className="ps-n">{String(i + 1).padStart(2, "0")}</span>
                          {cut > 0 ? (
                            <span className="ps-t"><strong>{b.slice(0, cut)}</strong><span className="ps-d">{b.slice(cut + 2)}</span></span>
                          ) : (
                            <span className="ps-t">{b}</span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <a className="btn" href="#register" data-register data-track={TRACK_CHOICE[track.id]} onClick={() => setOpen(null)}>
                    register for this track <span aria-hidden="true">→</span>
                  </a>
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
