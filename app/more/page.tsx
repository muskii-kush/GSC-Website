import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import Registration from "@/components/Registration";
import { ticket } from "@/components/Ticket";
import { footer, gets, why } from "@/lib/content";

export const metadata: Metadata = { title: "More about the Grand Startup Challenge 2027" };

// Content kept off the main page to keep it simple: why the challenge exists, and every benefit.
const ICONS = [
  <svg key="gov" viewBox="0 0 24 24"><path d="M3 9.5 12 4l9 5.5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18" /></svg>,
  <svg key="grow" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>,
  <svg key="sprout" viewBox="0 0 24 24"><path d="M12 21v-9M12 12c0-3.5-2.5-6-7-6 0 4 2.5 6 7 6zM12 14c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6z" /></svg>,
];

export default function More() {
  return (
    <SmoothScroll>
      <Nav base="/" page="more" />
      <main className="more-page">
        <section className="s-challenge" id="why">
          <p className="label accent">{why.eyebrow}</p>
          <h1 className="h-center">why this <span className="rw-word it">challenge</span></h1>
          <div className="room-grid why-grid">
            {why.items.map((w, i) => (
              <article className="room-card" key={w.title}>
                <span className="why-icon" aria-hidden="true">{ICONS[i]}</span>
                <span className="room-n">{i + 1}</span>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="s-gets" id="benefits">
          <p className="label gets-eyebrow">{gets.eyebrow}</p>
          <h2 className="h-center gets-title">and the prize is only the <span className="rw-word it">beginning</span></h2>
          <p className="soft center">{gets.lede}</p>
          <div className="tickets">
            {gets.items.map((g, i) => ticket(g, i, gets.items.length))}
          </div>
        </section>

        <section className="s-closing more-back">
          <a className="btn" href="/">Back to the main page <span aria-hidden="true">←</span></a>
        </section>

        <div className="chapter chapter-two more-foot">
          <p className="giant-mark" aria-hidden="true">GSC&rsquo;27</p>
          <footer className="footer">
            <span>{footer}</span>
            <a href="/">Back to the main page ↑</a>
          </footer>
        </div>
      </main>
      <Registration />
    </SmoothScroll>
  );
}
