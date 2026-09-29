import SmoothScroll from "@/components/SmoothScroll";
import ScrollProgress from "@/components/ScrollProgress";
import Nav from "@/components/Nav";
import Reveal from "@/components/Reveal";
import Countdown from "@/components/Countdown";
import Film from "@/components/Film";
import { ShapeDefs } from "@/components/Shape";
import DetailDrawer from "@/components/DetailDrawer";
import Registration from "@/components/Registration";
import {
  CONTACT, challenge, closing, footer, hero, invites, invitesIntro, journey, room, timeline, tracks, tracksIntro,
} from "@/lib/content";

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
            <p className="label rise">grand startup challenge · 2027</p>
            <Reveal as="p" className="statement" text={hero.statement} immediate stagger={0.08} />
          </section>

          <section className="glass invitation" data-grow>
            <div className="gsc-mark" aria-hidden="true">
              <img src="/media/gsc-logo.jpg" alt="" />
            </div>
            <h1 className="wordmark">grand startup challenge</h1>
            <div className="partners" aria-label="DPIIT, Cars24 and Startup Policy Forum">
              <img src="/media/dpiit.webp" alt="DPIIT Startup India" className="p-dpiit" />
              <span className="p-div" />
              <img src="/media/cars24.webp" alt="Cars24" className="p-cars24" />
              <span className="p-div" />
              <img src="/media/spf.webp" alt="Startup Policy Forum" className="p-spf" />
            </div>
            <p className="soft">{hero.lede}</p>
            <p className="when">{hero.when}</p>
            <Countdown />
            <div className="actions">
              <a className="btn" href="#register" data-register>register now <span aria-hidden="true">→</span></a>
              <a className="btn ghost" href="#invite/partner">partner with us</a>
            </div>
            <div className="stats">
              {hero.stats.map((s) => (
                <div key={s.label}>
                  <p className="stat-v">{s.value}</p>
                  <p className="stat-l">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <Film />

        <section className="s-challenge" id="challenge">
          <p className="label rise">{challenge.eyebrow}</p>
          <Reveal className="h-center" text={challenge.title} accent={["serious"]} />
          <p className="statement-sm rise">{challenge.statement}</p>
          <p className="soft center rise">{challenge.lede}</p>
          <div className="band">
            {challenge.band.map((b, i) => (
              <figure key={b.src} className={`band-fig b${i}`} data-speed={i ? -40 : 40}>
                <div className="band-img"><img src={b.src} alt={b.alt} /></div>
                <figcaption>{b.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="s-journey">
          <div className="dare">
            <p className="label rise">{journey.eyebrow}</p>
            <Reveal className="h-dare" text={journey.title} accent={["working"]} />
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
          <p className="label rise">{tracksIntro.eyebrow}</p>
          <Reveal className="h-center" text={tracksIntro.title} accent={["impact"]} />
          <p className="soft center rise">{tracksIntro.lede}</p>
          <div className="track-grid" data-stagger>
            {tracks.map((t, i) => (
              <a className="track" href={`#track/${t.id}`} key={t.id}>
                <div className={`track-img shape-${["base", "expressive", "motion", "soft"][i]}`}>
                  <img src={t.image} alt="" />
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
            <a className="btn rise" href={`mailto:${CONTACT}`}>talk to the team <span aria-hidden="true">↗</span></a>
            <p className="contact rise">{CONTACT}</p>
          </section>

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
