import { GetStartedButton } from "@/components/GetStartedButton";
import HeroChips from "@/components/HeroChips";
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
  CONTACT, gmailLink, challenge, closing, faq, footer, gallery, gets, hero, invites, invitesIntro, proof, room, timeline, tracks, tracksIntro, why,
} from "@/lib/content";

const TRACK_SHAPES: ShapeName[] = ["base", "expressive", "motion", "soft"];

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
            <HeroChips />
            <div className="gsc-mark" aria-hidden="true">
              <img src={asset("/media/gsc-logo.jpg")} alt="" />
            </div>
            <p className="wordmark">Grand Startup Challenge</p>
            <Reveal as="h1" className="statement" text={hero.statement} immediate stagger={0.08} />
            <p className="soft">{hero.lede}</p>
            <p className="when">{hero.when}</p>
            <Countdown />
            <div className="actions">
              <GetStartedButton className="hero-register" />
              <a className="btn ghost" href="#partners">partner with us</a>
            </div>
            <p className="hero-with">in partnership with</p>
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

        <Film />

        {/* 3. What this is, and why Cars24 is doing it. */}
        <section className="s-challenge" id="challenge">
          <Reveal className="h-center" text={challenge.title} accent={["event"]} />
          <p className="statement-sm rise">{challenge.statement}</p>
          <p className="soft center rise">{challenge.lede}</p>
          <p className="label accent why-label rise">{why.eyebrow}</p>
          <div className="room-grid why-grid" data-stagger>
            {why.items.map((w, i) => (
              <article className="room-card" key={w.title}>
                <span className="room-n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </article>
            ))}
          </div>
        </section>

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
        </section>

        {/* 5. How it works: the journey and the key dates, as one timeline. */}
        <section className="s-dates" id="timeline">
          <div className="dates-head">
            <p className="label rise">{timeline.eyebrow}</p>
            <Reveal className="h-dare" text={timeline.title} accent={["finale"]} />
            <p className="soft rise">{timeline.lede}</p>
            <a className="btn rise" href="#register" data-register>register now <span aria-hidden="true">→</span></a>
          </div>
          <ol className="dates">
            <span className="dates-line" data-draw aria-hidden="true" />
            {timeline.items.map((t, i) => (
              <li key={t.title} className={`rise${i === timeline.items.length - 1 ? " finale" : ""}`}>
                <span className="date">{t.date}</span>
                <h3>{t.title}</h3>
                <p>{t.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 6. What startups get. */}
        <section className="s-gets" id="benefits">
          <p className="label rise">{gets.eyebrow}</p>
          <Reveal className="h-center" text={gets.title} accent={["prize"]} />
          <p className="soft center rise">{gets.lede}</p>
          <div className="room-grid" data-stagger>
            {gets.items.map((g, i) => (
              <article className="room-card" key={g.title}>
                <span className="room-n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{g.title}</h3>
                <p>{g.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="s-gallery" aria-label="Gallery">
          <div className="gallery" data-stagger>
            {gallery.map((g) => (
              <figure key={g.src} className="gallery-fig">
                <div className="gallery-img"><img src={g.src} alt={g.alt} /></div>
                <figcaption>{g.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 7. Who will be in the room. */}
        <section className="s-room" id="community">
          <p className="label rise">{room.eyebrow}</p>
          <Reveal className="h-center" text={room.title} />
          <p className="soft center rise">{room.lede}</p>
          <div className="room-grid" data-stagger>
            {room.people.map((p, i) => (
              <article className="room-card" key={p.title}>
                <span className="room-n">{String(i + 1).padStart(2, "0")}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
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
          </section>

          {/* 9. Questions. */}
          <section className="s-faq" id="faq">
            <div className="faq-head">
              <p className="label rise">{faq.eyebrow}</p>
              <Reveal className="h-dare" text={faq.title} />
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
    </SmoothScroll>
  );
}
