import { Fragment } from "react";
import Countdown from "@/components/Countdown";
import StarField from "@/components/StarField";
import { asset } from "@/lib/asset";
import { hero } from "@/lib/content";

// Full-screen opening banner: a moving brand glow behind one centred stack —
// the GSC mark, the name (typed in letter by letter), the line (rising word by word),
// the date, the way in and the countdown.
const NAME = "Grand Startup Challenge";

export default function HeroBanner() {
  // Sentence case: first letter capital, the rest as written ("India" keeps its capital).
  const line = hero.statement.charAt(0).toUpperCase() + hero.statement.slice(1);
  const words = line.split(" ");
  return (
    <section className="banner" id="home" aria-label="Grand Startup Challenge 2027">
      <div className="banner-bg" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <span className="banner-glow" />
        <span className="banner-streaks" />
        <span className="northern-lights" />
        <StarField />
      </div>

      <div className="banner-copy">
        <div className="banner-mark" aria-hidden="true">
          <img src={asset("/media/gsc-logo.jpg")} alt="" />
        </div>
        <p className="banner-name" aria-label={NAME}>
          {/* Letters grouped per word, so a line never breaks inside a word */}
          {NAME.split(" ").map((word, wi, all) => {
            const start = all.slice(0, wi).join(" ").length + (wi ? 1 : 0);
            return (
              <Fragment key={wi}>
                <span className="bn-word" aria-hidden="true">
                  {word.split("").map((c, ci) => (
                    <span key={ci} style={{ ["--i" as string]: start + ci }}>{c}</span>
                  ))}
                </span>
                {wi < all.length - 1 ? " " : null}
              </Fragment>
            );
          })}
        </p>
        <h1 className="banner-title" aria-label={line}>
          {words.map((w, i) => (
            <Fragment key={i}>
              <span className="bw-mask" aria-hidden="true">
                <span className={`bw${w.toLowerCase() === "india" ? " bw-accent" : ""}`} style={{ ["--i" as string]: i }}>{w}</span>
              </span>
              {i < words.length - 1 ? " " : null}
            </Fragment>
          ))}
        </h1>
        <p className="banner-when">
          <span>{hero.when.label}</span>
          <span className="dot" aria-hidden="true" />
          <span>{hero.when.date}</span>
          {hero.when.venue && (
            <>
              <span className="dot" aria-hidden="true" />
              <span>{hero.when.venue}</span>
            </>
          )}
        </p>
        <div className="banner-actions">
          <a className="btn" href="#register" data-register>Register now <span aria-hidden="true">→</span></a>
          <a className="btn ghost" href="#partners">Partner with us</a>
        </div>
        <a className="elig-link banner-elig" href="#scoring">Check eligibility <span aria-hidden="true">↗</span></a>
      </div>

      <div className="banner-side">
        <Countdown />
      </div>
    </section>
  );
}
