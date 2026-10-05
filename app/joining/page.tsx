import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import Registration from "@/components/Registration";
import { footer, room } from "@/lib/content";

export const metadata: Metadata = { title: "Who will be joining · Grand Startup Challenge 2027" };

export default function Joining() {
  return (
    <SmoothScroll>
      <Nav base="/" page="joining" />
      <main className="more-page">
        <section className="s-room" id="community">
          <p className="label">{room.eyebrow}</p>
          <h1 className="h-center">who will be <span className="rw-word it">joining</span></h1>
          <p className="soft center">{room.lede}</p>
          <div className="room-grid">
            {room.people.map((p, i) => (
              <article className="room-card" key={p.title}>
                <span className="room-n">{i + 1}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
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
