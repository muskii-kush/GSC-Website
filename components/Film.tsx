export default function Film() {
  return (
    <section className="s-film" aria-label="Grand Startup Challenge motion intro">
      <div className="film-stage">
        <div className="film-frame" data-tilt>
          <video autoPlay muted loop playsInline preload="metadata" poster="/media/hero-poster.jpg" aria-label="Grand Startup Challenge motion intro">
            <source src="/media/hero.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </section>
  );
}
