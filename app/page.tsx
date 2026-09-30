import FloatingDock from "@/components/FloatingDock";
import CircuitOverlay from "@/components/CircuitOverlay";
import TiltCards from "@/components/TiltCards";
import RotatingWord from "@/components/RotatingWord";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import Countdown from "@/components/Countdown";
import Film from "@/components/Film";
import { ShapeDefs } from "@/components/Shape";
import { ShapeName, shapePath } from "@/lib/trapezoid";
import DetailDrawer from "@/components/DetailDrawer";
import Registration from "@/components/Registration";
import { asset } from "@/lib/asset";
import {
  CONTACT, gmailLink, challenge, closing, faq, footer, gets, hero, invites, invitesIntro, proof, room, bridges, timeline, tracks, tracksIntro, why,
} from "@/lib/content";

const TRACK_SHAPES: ShapeName[] = ["base", "expressive", "motion", "soft"];

// Wrap the given phrases of a sentence in <span className="it-soft"> (lilac accent, like the headings).
function accentPhrases(text: string, phrases: string[]) {
  const parts: (string | JSX.Element)[] = [];
  let rest = text;
  let key = 0;
  while (rest) {
    const hits = phrases.map((p) => ({ p, i: rest.indexOf(p) })).filter((h) => h.i >= 0).sort((a, b) => a.i - b.i);
    if (!hits.length) { parts.push(rest); break; }
    const { p, i } = hits[0];
    if (i > 0) parts.push(rest.slice(0, i));
    parts.push(<span className="it-soft" key={key++}>{p}</span>);
    rest = rest.slice(i + p.length);
  }
  return parts;
}

// A quiet hand-off at the end of a section: "Next · <section> ↓", linking to it.
// Line icons for the three "why this challenge" cards: government, growth, the next founders.
const WHY_ICONS = [
  <svg key="gov" viewBox="0 0 24 24"><path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18" /></svg>,
  <svg key="grow" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>,
  <svg key="sprout" viewBox="0 0 24 24"><path d="M12 21v-9M12 12c0-3.5-2.5-6-7-6 0 4 2.5 6 7 6zM12 14c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6z" /></svg>,
];

function Bridge({ label, target }: { label: string; target: string }) {
  return (
    <div className="bridge-row rise">
      <a className="bridge" href={target}>
        <span className="bridge-next">Next</span>
        <span className="bridge-label">{label}</span>
        <span className="bridge-arrow" aria-hidden="true">↓</span>
      </a>
    </div>
  );
}

// One benefit as an event pass: a stamped stub, a perforated tear line, the details.
function ticket(g: (typeof gets.items)[number], i: number, total: number) {
  return (
    <article className={`ticket${i === 0 ? " ticket-gold" : ""}`} key={g.title}>
      <div className="ticket-stub">
        <span className="ticket-admit">Admit one · {g.admit}</span>
        {/* A small rocket: the startup mark on every pass. It lifts off when the pass is hovered. */}
        <svg className="ticket-rocket" viewBox="0 0 32 32" aria-hidden="true">
          <g className="ticket-rocket-body">
            <path d="M16 3c4.4 3 6.6 7.6 6.6 13.2V21H9.4v-4.8C9.4 10.6 11.6 6 16 3z" />
            <circle cx="16" cy="13" r="2.4" />
            <path d="M9.4 17.5 6 21.5V24h3.4M22.6 17.5 26 21.5V24h-3.4" />
            <path className="ticket-rocket-flame" d="M13.4 21.5c0 3 1.2 5 2.6 6.8 1.4-1.8 2.6-3.8 2.6-6.8" />
          </g>
        </svg>
        <strong className={`ticket-stamp${g.stamp.length > 6 ? " is-long" : ""}`}>{g.stamp}</strong>
        <span className="ticket-no">Pass {i + 1} of {total}</span>
      </div>
      <div className="ticket-body">
        <span className="ticket-event">Grand Startup Challenge 2027</span>
        <h3>{g.title}</h3>
        <p>{g.text}</p>
        <span className="ticket-code" aria-hidden="true" />
      </div>
    </article>
  );
}

export default function Page() {
  return (
    <SmoothScroll>
      <ShapeDefs />
      <ScrollProgress />
      <Nav />

      <main id="top">
        {/* 1. Hero: one block. Who we are, the promise, the date, the way in. */}
        <div className="chapter chapter-one">
          <section className="glass invitation" data-grow>
            <div className="gsc-mark" aria-hidden="true">
              <img src={asset("/media/gsc-logo.jpg")} alt="" />
            </div>
            <p className="wordmark">Grand Startup Challenge</p>
            <Reveal as="h1" className="statement" text={hero.statement} immediate stagger={0.08} />
            <p className="soft">{hero.lede}</p>
            <p className="when">
              <span className="when-label">{hero.when.label}</span>
              <span className="when-item">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
                {hero.when.date}
              </span>
              <span className="when-item">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
                {hero.when.venue}
              </span>
            </p>
            <Countdown />
            <div className="actions">
              <div className="reg-stack">
                <a className="reg-link" href="#register" data-register>register now <span className="reg-arrow" aria-hidden="true">→</span></a>
                <a className="elig-link" href="#scoring">check eligibility <span aria-hidden="true">↗</span></a>
              </div>
              <a className="btn ghost" href="#partners">partner with us</a>
            </div>
            <p className="hero-with">brought to you by</p>
            <div className="partners" aria-label="DPIIT, Cars24 and Startup Policy Forum">
              <img src={asset("/media/dpiit.webp")} alt="DPIIT Startup India" className="p-dpiit" />
              <span className="p-div" />
              <img src={asset("/media/cars24.webp")} alt="Cars24" className="p-cars24" />
              <span className="p-div" />
              <img src={asset("/media/spf.webp")} alt="Startup Policy Forum" className="p-spf" />
            </div>
          </section>
        </div>

        {/* 2. Proof: the numbers, at a glance. */}
        <div className="proof" aria-label="The challenge at a glance">
          <div className="proof-track">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1 ? true : undefined}>
                {proof.map((p) => <li key={p}>{p}</li>)}
              </ul>
            ))}
          </div>
        </div>

        {/* 3. What this is, and why it matters. */}
        <section className="s-challenge" id="challenge">
          <Reveal className="h-center" text={challenge.title} accent={["event"]} />
          <p className="statement-sm rise">{accentPhrases(challenge.statement, ["Startup India and the Startup Policy Forum", "real problems", "national recognition"])}</p>
          <p className="label accent why-label rise">{why.eyebrow}</p>
          {/* Numbers lit in mint; the cards tilt towards the cursor. */}
          <div className="why-wrap">
          <div className="room-grid why-grid" data-stagger>
            {why.items.map((w, i) => (
              <article className="room-card" data-tiltcard key={w.title}>
                <span className="why-icon" aria-hidden="true">{WHY_ICONS[i]}</span>
                <span className="room-n">{i + 1}</span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </article>
            ))}
          </div>
          </div>
          <Bridge {...bridges.about} />
        </section>

        <Film />

        {/* 4. The problems to solve. */}
        <section className="s-tracks" id="tracks">
          <Reveal className="h-center" text={tracksIntro.title} accent={["problem", "tracks"]} />
          <p className="soft center rise">{tracksIntro.lede}</p>
          <div className="track-grid" data-stagger>
            {tracks.map((t, i) => (
              <a className="track" href={`#track/${t.id}`} key={t.id}>
                <div className={`track-img shape-${TRACK_SHAPES[i]}`}>
                  <img src={t.image} alt="" />
                  {t.hoverImage && <img className="track-color" src={t.hoverImage} alt="" />}
                  <svg className="track-line" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                    <path d={shapePath(TRACK_SHAPES[i])} />
                  </svg>
                  <span className="track-go" aria-hidden="true">↗</span>
                </div>
                <p className="label">{t.num}</p>
                <h3>{t.name}</h3>
                <p className="track-sum">{t.summary}</p>
                <span className="track-link">explore the brief ↘</span>
              </a>
            ))}
          </div>
          <Bridge {...bridges.tracks} />
        </section>

        {/* 5. What startups get: the reward, before the process. */}
        <section className="s-gets" id="benefits">
          {/* Eyebrow, then the headline prize as a golden ticket, then the write-up and the other five passes. */}
          <p className="label rise gets-eyebrow">{gets.eyebrow}</p>
          <div className="tickets tickets-lead" data-stagger>
            {gets.items.slice(0, 1).map((g, i) => ticket(g, i, gets.items.length))}
          </div>
          <Reveal className="h-center gets-title" text={gets.title} accent={["beginning"]} />
          <p className="soft center rise">{gets.lede}</p>
          <div className="tickets" data-stagger>
            {gets.items.slice(1).map((g, i) => ticket(g, i + 1, gets.items.length))}
          </div>
          <Bridge {...bridges.benefits} />
        </section>

        {/* 6. How it works: the journey and the key dates, as one timeline. */}
        <section className="s-dates" id="timeline">
          {/* Desktop: the section holds (CSS sticky) while the months glide past left to right.
              Tablet and phone: the same timeline, read top to bottom. */}
          <div className="tl-wrap" data-htl>
          <div className="tl-pin">
          <div className="dates-head">
            <p className="label rise">{timeline.eyebrow}</p>
            <Reveal className="h-dare" text={timeline.title} accent={["finale"]} />
            <p className="soft rise">{timeline.lede}</p>
            <a className="rubric-link rise" href="#scoring">eligibility and scoring <span aria-hidden="true">↗</span></a>
            <div className="dates-actions rise">
              <a className="btn" href="#register" data-register>register now <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div className="tl-viewport">
          {/* Desktop only: the timeline moves sideways as you scroll down, which is not obvious at first. */}
          <p className="tl-hint" aria-hidden="true">Keep scrolling down to move along the timeline <span>→</span></p>
          <ol className="dates">
            <span className="dates-line" aria-hidden="true" />
            {timeline.items.map((t, i) => (
              <li key={t.title} className={`rise${i === timeline.items.length - 1 ? " finale" : ""}`}>
                <span className="date">{t.date}</span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </li>
            ))}
          </ol>
          </div>
          </div>
          </div>
          <Bridge {...bridges.timeline} />
        </section>

        {/* 7. Who will be in the room. */}
        <section className="s-room" id="community">
          {/* Heading and cards stay on screen (CSS sticky) while the deck deals out.
              Sticky, not a GSAP pin: a pin re-parents React's DOM and breaks removeChild on reloads. */}
          <div className="fan-wrap">
          <div className="fan-pin">
          <p className="label rise">{room.eyebrow}</p>
          <Reveal className="h-center" text={room.title} accent={["joining"]} />
          <p className="soft center rise">{room.lede}</p>
          <div className="circuit-host">
          <div className="room-grid fan-grid" data-fan>
            {room.people.map((p, i) => (
              <article className="room-card" key={p.title}>
                <span className="room-n">{i + 1}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
          {/* Hint beside the stacked deck: the cards deal out with scroll, not with a click */}
          <p className="deck-hint" aria-hidden="true">Scroll to continue <span className="deck-hint-arrow">↓</span></p>
          {/* Mint circuit between the cards; lights up once the deck has dealt out */}
          <CircuitOverlay gridSelector=".fan-grid" />
          </div>
          </div>
          </div>
          <Bridge {...bridges.room} />
        </section>

        {/* Chapter two: the way in. The page ends in the brand glow. */}
        <div className="chapter chapter-two">
          {/* 8. Partner with us. */}
          <section className="s-invites" id="partners">
            <p className="label rise">{invitesIntro.eyebrow}</p>
            <Reveal className="h-center" text={invitesIntro.title} accent={["room"]} />
            <p className="soft center rise">{invitesIntro.lede}</p>
            <div className="invite-grid" data-stagger="together">
              {invites.map((v) => (
                <a className="glass invite" href={`#invite/${v.id}`} key={v.id}>
                  <p className="label accent">{v.label}</p>
                  <h3>{v.card}</h3>
                  <p>{v.cardText}</p>
                  <span className="invite-link">{v.link.toLowerCase()} ↗</span>
                </a>
              ))}
            </div>
            <Bridge {...bridges.partners} />
          </section>

          {/* 9. Questions. */}
          <section className="s-faq" id="faq">
            <div className="faq-head">
              <p className="label rise">{faq.eyebrow}</p>
              <Reveal className="h-dare faq-title" text={faq.title} accent={["ask", "away"]} />
              <p className="soft rise">Anything else? Write to <a href={gmailLink()} target="_blank" rel="noopener noreferrer">{CONTACT}</a>.</p>
            </div>
            <div className="faq-list">
              {faq.items.map((f) => (
                <details className="faq-item rise" key={f.q}>
                  <summary>
                    <span>{f.q}</span>
                    <span className="faq-plus" aria-hidden="true" />
                  </summary>
                  <p>{f.a}</p>
                  {f.link && (
                    <a className="faq-link" href={f.link.href}>{f.link.label} <span aria-hidden="true">↗</span></a>
                  )}
                </details>
              ))}
            </div>
          </section>

          {/* 10. Last call, then the sign-off. */}
          <section className="s-closing">
            <p className="label rise">{closing.eyebrow}</p>
            <Reveal className="statement" text={closing.title} accent={["worth", "solving"]} />
            <div className="actions rise">
              <a className="btn" href="#register" data-register>register now <span aria-hidden="true">→</span></a>
              <a className="btn ghost" href={gmailLink()} target="_blank" rel="noopener noreferrer">talk to the team <span aria-hidden="true">↗</span></a>
            </div>
            <p className="contact rise"><a className="contact-link" href={gmailLink()} target="_blank" rel="noopener noreferrer">{CONTACT}</a></p>
          </section>

          <p className="signoff rise">
            let&rsquo;s <RotatingWord words={["build", "pitch", "scale", "deploy"]} /> what moves india forward
          </p>
          <div className="footer-logos">
            <p className="footer-by">brought to you by</p>
            <div className="partners" aria-label="DPIIT, Cars24 and Startup Policy Forum">
              <img src={asset("/media/dpiit.webp")} alt="DPIIT Startup India" className="p-dpiit" />
              <span className="p-div" />
              <img src={asset("/media/cars24.webp")} alt="Cars24" className="p-cars24" />
              <span className="p-div" />
              <img src={asset("/media/spf.webp")} alt="Startup Policy Forum" className="p-spf" />
            </div>
          </div>
          <p className="giant-mark" aria-hidden="true">GSC&rsquo;27</p>
          <footer className="footer">
            <span>{footer}</span>
            <a href="#top">Back to top ↑</a>
          </footer>
        </div>
      </main>

      <DetailDrawer />
      <Registration />
      <FloatingDock />
      <TiltCards />
    </SmoothScroll>
  );
}
