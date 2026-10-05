import FloatingDock from "@/components/FloatingDock";
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
import { ticket } from "@/components/Ticket";
import { asset } from "@/lib/asset";
import {
  CONTACT, gmailLink, challenge, closing, faq, footer, gets, hero, invites, invitesIntro, timeline, tracks, tracksIntro,
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



export default function Page() {
  return (
    <SmoothScroll>
      <ShapeDefs />
      <ScrollProgress />
      <Nav />

      <main id="top">
        {/* 1. Hero: one block. Who we are, the promise, the date, the way in. */}
        <div className="chapter chapter-one">
          <section className="glass invitation">
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

        {/* 3. What this is, and why it matters. */}
        <section className="s-challenge" id="challenge">
          <Reveal className="h-center" text={challenge.title} accent={["event"]} />
          <p className="statement-sm rise">{accentPhrases(challenge.statement, ["Startup India and the Startup Policy Forum", "real problems", "national recognition"])}</p>
        </section>

        <Film />

        {/* 4. The problems to solve. */}
        <section className="s-tracks" id="tracks">
          <Reveal className="h-center" text={tracksIntro.title} accent={["problem", "tracks"]} />
          <p className="soft center rise">{tracksIntro.lede}</p>
          <div className="track-grid">
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
        </section>

        {/* 5. What startups get: the reward, before the process. */}
        <section className="s-gets" id="benefits">
          {/* Eyebrow, then the headline prize as a golden ticket, then the write-up and the other five passes. */}
          <div className="tickets tickets-lead">
            {gets.items.slice(0, 1).map((g, i) => ticket(g, i, gets.items.length))}
          </div>
        </section>

        {/* 6. Timeline: title on the left, the dates down a line on the right. */}
        <section className="s-tl" id="timeline">
          <div className="tl2">
            <div className="tl2-head">
              <h2 className="h-dare rise">Timeline</h2>
            </div>
            <ol className="tl2-list">
              <span className="tl2-line" data-draw aria-hidden="true" />
              {timeline.items.map((t, i) => (
                <li key={t.title} className={`rise${i === timeline.items.length - 1 ? " finale" : ""}`}>
                  <span className="date">{t.date}</span>
                  <h3>{t.title}</h3>
                  <p>{t.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>


        {/* Chapter two: the way in. The page ends in the brand glow. */}
        <div className="chapter chapter-two">
          {/* 8. Partner with us. */}
          <section className="s-invites" id="partners">
            <p className="label rise">{invitesIntro.eyebrow}</p>
            <Reveal className="h-center" text={invitesIntro.title} accent={["room"]} />
            <p className="soft center rise">{invitesIntro.lede}</p>
            <div className="invite-grid">
              {invites.map((v) => (
                <a className="glass invite" href={`#invite/${v.id}`} key={v.id}>
                  <p className="label accent">{v.label}</p>
                  <h3>{v.card}</h3>
                  <p>{v.cardText}</p>
                  <span className="invite-link">{v.link.toLowerCase()} ↗</span>
                </a>
              ))}
            </div>
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
            <Reveal className="statement" text={closing.title} accent={["worth", "solving"]} />
            <div className="actions rise">
              <a className="btn" href="#register" data-register>register now <span aria-hidden="true">→</span></a>
              <a className="btn ghost" href={gmailLink()} target="_blank" rel="noopener noreferrer">talk to the team <span aria-hidden="true">↗</span></a>
            </div>
            <p className="contact rise"><a className="contact-link" href={gmailLink()} target="_blank" rel="noopener noreferrer">{CONTACT}</a></p>
          </section>


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
    </SmoothScroll>
  );
}
