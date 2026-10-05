import FloatingDock from "@/components/FloatingDock";
import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import HeroBanner from "@/components/HeroBanner";
import Film from "@/components/Film";
import { ShapeDefs } from "@/components/Shape";
import { ShapeName, shapePath } from "@/lib/trapezoid";
import DetailDrawer from "@/components/DetailDrawer";
import Registration from "@/components/Registration";
import { ticket } from "@/components/Ticket";
import { asset } from "@/lib/asset";
import {
  CONTACT, gmailLink, challenge, faq, footer, gets, hero, invites, invitesIntro, timeline, tracks, tracksIntro,
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
        {/* 1. Banner: full screen, the promise and the way in. */}
        <HeroBanner />

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

        {/* 6. Timeline. Desktop: the section holds while the dates glide past left to right
            (as on gsc.cars24.com). Tablet and phone: the same timeline, read top to bottom. */}
        <section className="s-dates" id="timeline">
          <div className="tl-wrap" data-htl>
          <div className="tl-pin">
          <div className="dates-head">
            <p className="label rise">Timeline</p>
            <Reveal className="h-dare" text={timeline.title} accent={["finale"]} />
            <p className="soft rise">{timeline.lede}</p>
            <a className="rubric-link rise" href="#scoring">eligibility and scoring <span aria-hidden="true">↗</span></a>
            <div className="dates-actions rise">
              <a className="btn" href="#register" data-register>register now <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div className="tl-viewport">
          <p className="tl-hint" aria-hidden="true">Keep scrolling to move along the timeline <span>→</span></p>
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
