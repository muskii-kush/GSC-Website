import { gets } from "@/lib/content";

// One benefit as an event pass: a stamped stub, a perforated tear line, the details.
export function ticket(g: (typeof gets.items)[number], i: number, total: number) {
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
