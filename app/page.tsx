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
  CONTACT, gmailLink, challenge, closing, footer, gallery, hero, invites, invitesIntro, journey, room, timeline, tracks, tracksIntro,
} from "@/lib/content";

const TRACK_SHAPES: ShapeName[] = ["base", "expressive", "motion", "soft"];

export default function Page() {
  return (
    <SmoothScroll>
      <ShapeDefs />
      <ScrollProgress />
      <Nav />

      <main id="top">
        {/* Chapter one: the invitation. Gradient rises from the bottom edge. */}
        <div className="chapter chapter-one">
          <section className="s-hero">
            <Reveal as="p" className="statement" text={hero.statement} immediate stagger={0.08} />
          </section>

          <section className="glass invitation" data-grow>
            <div className="gsc-mark" aria-hidden="true">
              <img src={asset("/media/gsc-logo.jpg")} alt="" />
            </div>
            <h1 className="wordmark">Grand Startup Challenge</h1>
            <div className="partners" aria-label="DPIIT, Cars24 and Startup Policy Forum">
              <img src={asset("/media/dpiit.webp")} alt="DPIIT Startup India" className="p-dpiit" />
              <span className="p-div" />
              <img src={asset("/media/cars24.webp")} alt="Cars24" className="p-cars24" />
              <span className="p-div" />
              <img src={asset("/media/spf.webp")} alt="Startup Policy Forum" className="p-spf" />
            </div>
            <p className="soft">{hero.lede}</p>
            <p className="when">{hero.when}</p>
            <Countdown />
            <div className="actions">
              <a className="btn" href="#register" data-register>register now <span aria-hidden="true">→</span></a>
              <a className="btn ghost" href="#partners">partner with us</a>
            </div>
          </section>
        </div>

        <Film />

        <section className="s-challenge" id="challenge">
          <Reveal className="h-center" text={challenge.title} accent={["event"]} />
          <p className="statement-sm rise">{challenge.statement}</p>
          <p className="soft center rise">{challenge.lede}</p>
          <div className="stats metrics" data-stagger>
            {challenge.metrics.map((m) => (
              <div key={m.label}>
                <p className="stat-v">{m.value}</p>
                <p className="stat-l">{m.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="s-journey">
          <div className="dare">
            <Reveal className="h-dare" text={journey.title} accent={["journey"]} />
            <p className="soft rise">{journey.lede}</p>
          </div>
          <ol className="steps" data-stagger>
            {journey.steps.map((s) => (
              <li key={s.n}>
                <span className="step-n">{s.n}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

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

        <section className="s-dates" id="timeline">
          <div className="dates-head">
            <p className="label rise">{timeline.eyebrow}</p>
            <Reveal className="h-dare" text={timeline.title} />
            <p className="soft rise">{timeline.lede}</p>
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
          <section className="s-invites" id="partners">
            <p className="label rise">{invitesIntro.eyebrow}</p>
            <Reveal className="h-center" text={invitesIntro.title} accent={["room"]} />
            <p className="soft center rise">{invitesIntro.lede}</p>
            <div className="invite-grid" data-stagger>
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


          <section className="s-closing">
            <p className="label rise">{closing.eyebrow}</p>
            <Reveal className="statement" text={closing.title} accent={["worth", "solving"]} />
            <a className="btn rise" href={gmailLink()} target="_blank" rel="noopener noreferrer">talk to the team <span aria-hidden="true">↗</span></a>
            <p className="contact rise"><a className="contact-link" href={gmailLink()} target="_blank" rel="noopener noreferrer">{CONTACT}</a></p>
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
