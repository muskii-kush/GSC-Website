"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GOOGLE_FORM_VIEW_URL, INELIGIBLE, MAX_DECK_BYTES, PENDING, SUBMIT_URL, pages, type Page, type Question } from "@/lib/application-form";
import {
  E, FOUNDER_CORE, checkApplication, checkEmail, checkField, checkFounders, checkLinkedinProfile, checkPhone, checkRevenue,
  checkWritten, checkXProfile, normalise,
} from "@/lib/application-checks";
import { APPLICATIONS_CLOSE, APPLICATIONS_OPEN, CONTACT, gmailLink } from "@/lib/content";

/**
 * The application, in the site's own design. Answers autosave in this browser
 * as the founder types; on submit they are posted to the Google Form, so every
 * application lands in the same Form and response Sheet.
 *
 * Any element with [data-register] opens it. [data-track="<choice>"] on that
 * element preselects the track.
 */

type Answers = Record<string, string | string[]>;
type Draft = { answers: Answers; step: number; submittedAt?: string };

const DRAFT_KEY = "gsc-application-v3";
const TRACK_ENTRY = "entry.1532659170";

function loadDraft(): Draft | null {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { return null; }
}
function saveDraft(d: Draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage blocked: the form still works */ }
}

function lock(on: boolean) {
  if (!on && document.querySelector(".detail.open")) return;
  document.documentElement.classList.toggle("is-locked", on);
  window.dispatchEvent(new CustomEvent("gsc:lock", { detail: on }));
}

const text = (v: Answers[string] | undefined) => (typeof v === "string" ? v : "");
const list = (v: Answers[string] | undefined) => (Array.isArray(v) ? v : []);

/** Question entry by stable key, e.g. BY_KEY["f2.email"]. */
const BY_KEY: Record<string, string> = Object.fromEntries(
  pages.flatMap((p) => p.questions).filter((q) => q.key).map((q) => [q.key!, q.entry]),
);

/** Founder slots 2 to 4: optional, but once started, the core fields are required. */
function required(q: Question, answers: Answers): boolean {
  if (q.required) return true;
  const m = q.key?.match(/^f([2-4])\.(\w+)$/);
  if (!m || !FOUNDER_CORE.includes(m[2])) return false;
  return FOUNDER_CORE.some((f) => text(answers[BY_KEY[`f${m[1]}.${f}`]]).trim());
}

/** The chosen deck file. Files cannot be kept in the saved draft, so this lives only for the visit. */
let DECK: File | null = null;

function checkDeckFile(hadDraft: boolean): string | null {
  if (!DECK) return hadDraft ? "Please attach the deck again. Files are not saved between visits." : "Attach your pitch deck as a PDF.";
  if (!/\.pdf$/i.test(DECK.name) && DECK.type !== "application/pdf") return "The deck must be a PDF file.";
  if (DECK.size > MAX_DECK_BYTES) return `The deck is ${(DECK.size / 1048576).toFixed(1)}MB. Please keep it to 50MB or smaller.`;
  if (DECK.size < 10 * 1024) return "This file looks empty. Please attach your full deck.";
  return null;
}


function validate(q: Question, v: Answers[string] | undefined, answers: Answers): string | null {
  if (q.kind === "file") return checkDeckFile(!!text(v));
  if (q.kind === "checkbox") {
    const picked = list(v);
    if (q.required && picked.length < (q.choices?.length ?? 1)) return `Please tick all ${q.choices?.length === 6 ? "six" : q.choices?.length}.`;
    return null;
  }
  const s = text(v).trim();
  if (!s) {
    if (!required(q, answers)) return null;
    return q.required ? "This question needs an answer." : "You have started this founder's details, so this is needed too.";
  }
  if (q.max && s.length > q.max) return `Keep it to ${q.max} characters. You are at ${s.length}.`;
  if (q.kind === "phone") return checkPhone(s);
  if (q.key?.endsWith(".linkedin")) return checkLinkedinProfile(s);
  if (q.key?.endsWith(".x")) return checkXProfile(s);
  if (q.key?.endsWith(".name") && (s.length < 3 || !/^[\p{L} .'-]+$/u.test(s) || !/\s/.test(s))) return "Give the founder's full name, first and last.";
  if (q.kind === "email") return checkEmail(s);
  if (q.kind === "number") return checkRevenue(s);
  const specific = checkField(q.entry, s, answers);
  if (specific) return specific;
  if (q.kind === "url") {
    try {
      const u = new URL(s);
      if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) throw new Error();
    } catch { return "Paste the full link, starting with https://"; }
  }
  // Written answers: no placeholders, keyboard mash or one-word answers.
  if (q.kind === "paragraph" && q.required && q.entry !== E.linkedin && q.entry !== E.family) return checkWritten(s, 30);
  if (q.kind === "paragraph" && q.entry !== E.linkedin && q.entry !== E.family) return checkWritten(s, 5);
  return null;
}

const PARAGRAPHS = pages.flatMap((p) => p.questions.filter((q) => q.kind === "paragraph").map((q) => q.entry));

/** Pages the founder actually sees, given their answers so far. */
function visiblePages(answers: Answers): Page[] {
  const out: Page[] = [];
  let skip = false;
  for (const p of pages) {
    if (p.conditional && skip) { skip = false; continue; }
    skip = p.questions.some((q) => q.skipNext?.includes(text(answers[q.entry])));
    out.push(p);
  }
  return out;
}

function windowState() {
  const now = Date.now();
  // Local testing can submit before the window opens.
  if (process.env.NODE_ENV !== "production") return "open" as const;
  if (now < new Date(APPLICATIONS_OPEN).getTime()) return "before" as const;
  if (now > new Date(APPLICATIONS_CLOSE).getTime()) return "closed" as const;
  return "open" as const;
}

/**
 * The site's own application form. Answers and the deck PDF go to the Cloudflare Pages Function
 * at /api/apply (functions/api/apply.js), which stores the deck in R2 and submits the response to
 * the Google Form.
 */
export default function SiteApplicationForm() {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stopped, setStopped] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [failMsg, setFailMsg] = useState("");
  const [submittedAt, setSubmittedAt] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<"before" | "open" | "closed">("open");
  const panel = useRef<HTMLElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => visiblePages(answers), [answers]);
  const page = shown[Math.min(step, shown.length - 1)];
  const last = step >= shown.length - 1;

  // A saved draft can point past the end, e.g. when a changed answer hides a conditional
  // section. Pull the step back so the counter and Back button stay right.
  useEffect(() => {
    if (step > shown.length - 1) setStep(shown.length - 1);
  }, [step, shown.length]);

  // Restore the draft once, on the client.
  useEffect(() => {
    const d = loadDraft();
    if (d) {
      setAnswers(d.answers || {});
      setStep(d.step || 0);
      setSubmittedAt(d.submittedAt);
      if (d.submittedAt) setStatus("sent");
    }
    setPhase(windowState());
    setLoaded(true);
  }, []);

  // Autosave on every change.
  useEffect(() => {
    if (loaded) saveDraft({ answers, step, submittedAt });
  }, [answers, step, submittedAt, loaded]);

  const show = useCallback((track?: string) => {
    if (track) setAnswers((a) => (text(a[TRACK_ENTRY]) ? a : { ...a, [TRACK_ENTRY]: track }));
    setOpen(true);
    lock(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    lock(false);
    if (location.hash === "#register") {
      try { history.pushState({}, "", "#top"); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-register]");
      if (!el) return;
      e.preventDefault();
      try { history.pushState({}, "", "#register"); } catch { /* ignore */ }
      show(el.dataset.track);
    };
    const onKey = (e: KeyboardEvent) => {
      // Esc closes the rubric first if it is open on top of the form.
      if (e.key === "Escape" && document.querySelector(".registration.open") && !document.querySelector(".detail.open")) hide();
    };
    const onPop = () => { if (location.hash === "#register") show(); else { setOpen(false); lock(false); } };
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    if (location.hash === "#register") show();
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
  }, [show, hide]);

  const toTop = () => panel.current?.scrollTo({ top: 0, behavior: "smooth" });

  // Bring a question with an error into view and put the cursor in it. Waits a frame so a
  // section change has rendered; centring keeps it clear of the sticky progress and button bars.
  const focusError = (entry: string) => {
    requestAnimationFrame(() => setTimeout(() => {
      const box = document.getElementById(`q-${entry}`);
      if (!box) return;
      box.scrollIntoView({ behavior: "smooth", block: "center" });
      box.querySelector<HTMLElement>("input:not(.app-hp), textarea, select")?.focus({ preventScroll: true });
    }, 60));
  };

  const set = (q: Question, v: string | string[]) => {
    setAnswers((a) => ({ ...a, [q.entry]: v }));
    if (errors[q.entry]) setErrors((e) => { const n = { ...e }; delete n[q.entry]; return n; });
  };

  // Check a typed answer as soon as the founder leaves the field, not only on Continue.
  const blurCheck = (q: Question) => {
    const v = answers[q.entry];
    if (!text(v).trim()) return;
    const m = validate(q, v, answers);
    setErrors((e) => { const n = { ...e }; if (m) n[q.entry] = m; else delete n[q.entry]; return n; });
  };

  const checkPage = (): boolean => {
    const errs: Record<string, string> = {};
    page.questions.forEach((q) => { const m = validate(q, answers[q.entry], answers); if (m) errs[q.entry] = m; });
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      focusError(first);
      return false;
    }
    return true;
  };

  const next = () => {
    if (!checkPage()) return;
    if (page.founders) {
      const dupe = checkFounders(answers, BY_KEY);
      if (dupe) { setErrors({ [dupe.entry]: dupe.message }); focusError(dupe.entry); return; }
    }
    const knock = page.questions.find((q) => q.stop?.includes(text(answers[q.entry])));
    if (knock) { setStopped(knock.title); toTop(); return; }
    // Founder 1 is the applicant: carry their email and mobile across.
    setAnswers((a) => {
      const n = { ...a };
      if (!text(n[BY_KEY["f1.email"]]) && text(a.emailAddress)) n[BY_KEY["f1.email"]] = text(a.emailAddress);
      if (!text(n[BY_KEY["f1.phone"]]) && text(a[BY_KEY.phone])) n[BY_KEY["f1.phone"]] = text(a[BY_KEY.phone]);
      return n;
    });
    setStep((s) => Math.min(s + 1, shown.length - 1));
    toTop();
  };

  const back = () => { setStopped(null); setErrors({}); setStep((s) => Math.max(0, s - 1)); toTop(); };

  const submit = async () => {
    if (!checkPage() || phase !== "open") return;
    // Re-check every visible page, in case a saved draft skipped a rule.
    for (let i = 0; i < shown.length; i++) {
      const bad = shown[i].questions.find((q) => validate(q, answers[q.entry], answers));
      if (bad) {
        setStep(i);
        setErrors({ [bad.entry]: validate(bad, answers[bad.entry], answers)! });
        focusError(bad.entry);
        return;
      }
    }
    const founderDupe = checkFounders(answers, BY_KEY);
    if (founderDupe) {
      setStep(shown.findIndex((p) => p.founders));
      setErrors({ [founderDupe.entry]: founderDupe.message });
      focusError(founderDupe.entry);
      return;
    }
    // Safety: never send while a question is not linked to the live Google Form, or the receiver is not set up.
    if (!SUBMIT_URL || shown.some((p) => p.questions.some((q) => q.entry.startsWith(PENDING)))) {
      setFailMsg("Submissions are being switched on. Your answers are saved in this browser; please try again shortly.");
      setStatus("failed");
      return;
    }
    const dup = checkApplication(answers, PARAGRAPHS.filter((e) => shown.some((p) => p.questions.some((q) => q.entry === e))));
    if (dup) {
      const at = shown.findIndex((p) => p.questions.some((q) => q.entry === dup.entry));
      setStep(at);
      setErrors({ [dup.entry]: dup.message });
      focusError(dup.entry);
      return;
    }
    // Bots fill every field, including this hidden one. People never see it.
    if (honeypot.current?.value) { setStatus("sent"); return; }
    // Answers as [entry, value] pairs. Email and the deck travel separately: the receiver
    // saves the deck to Drive and adds its link to the Form's "Pitch deck link" question.
    const fields: [string, string][] = [];
    shown.forEach((p) => p.questions.forEach((q) => {
      if (q.kind === "file" || q.entry === "emailAddress") return;
      const v = answers[q.entry];
      if (Array.isArray(v)) v.forEach((x) => fields.push([q.entry, x]));
      else if (v && v.trim()) fields.push([q.entry, normalise(q.entry, v, q.key)]);
    }));
    setStatus("sending");
    setFailMsg("");
    try {
      const deck = DECK!;
      const company = text(answers[E.company]).replace(/\s+/g, "");
      const founder = text(answers[BY_KEY["f1.name"]]).replace(/\s+/g, "");
      const payload = {
        email: normalise("emailAddress", text(answers.emailAddress)),
        pageHistory: shown.map((p) => p.section).join(","),
        fields,
        deckName: `${company || "Company"}_${founder || "Founder"}_PitchDeck.pdf`,
      };
      const body = new FormData();
      body.append("payload", JSON.stringify(payload));
      body.append("deck", deck, payload.deckName);
      const res = await fetch(SUBMIT_URL, { method: "POST", body });
      const out = await res.json().catch(() => ({ ok: false, message: "" }));
      if (!out.ok) {
        setFailMsg(out.message || "That did not go through. Please try again in a minute. Your answers are still saved.");
        setStatus("failed");
        return;
      }
      DECK = null;
      setSubmittedAt(new Date().toISOString());
      setStatus("sent");
      toTop();
    } catch {
      setFailMsg("That did not go through. Check your connection and press submit again. Your answers are still saved.");
      setStatus("failed");
    }
  };


  const email = text(answers.emailAddress);
  const pct = Math.round((step / Math.max(1, shown.length - 1)) * 100);

  return (
    <aside
      ref={panel}
      className={`registration overlay${open ? " open" : ""}`}
      id="registration"
      aria-hidden={!open}
      data-lenis-prevent
    >
      <div className="registration-inner">
        <div className="registration-head">
          <span className="eyebrow">Application</span>
          <button className="close" type="button" onClick={hide}>Close ×</button>
        </div>

        {status === "sent" ? (
          <div className="app-done">
            <h2>application received</h2>
            <p className="registration-lede">
              Thank you. Your application for the Grand Startup Challenge 2027 has been received.
              Applications are reviewed on a rolling basis, and we will write
              {email ? <> to <strong>{email}</strong></> : null} with the outcome. We may contact you for clarification before then;
              that does not mean the application has been selected.
            </p>
            <p className="app-fineprint">
              Answers cannot be edited once submitted. If something is wrong, write to{" "}
              <a href={gmailLink("Grand Startup Challenge application")} target="_blank" rel="noopener noreferrer">{CONTACT}</a>.
            </p>
          </div>
        ) : stopped ? (
          <div className="app-stop">
            <h2>{INELIGIBLE.title.toLowerCase()}</h2>
            <p className="registration-lede">{INELIGIBLE.text}</p>
            <p className="app-fineprint">The answer that stopped the application: “{stopped}”</p>
            <div className="wizard-nav step-active">
              <button type="button" className="wizard-back" onClick={() => { setStopped(null); toTop(); }}>← Change my answer</button>
              <a className="wizard-save-exit" href="#scoring">Read the eligibility checks</a>
            </div>
          </div>
        ) : (
          <>
            <div className="wizard-progress">
              <div className="wizard-progress-top">
                <span>Section {step + 1} of {shown.length}</span>
                <span className="wizard-progress-pct">Saved in this browser</span>
              </div>
              <div className="wizard-progress-track"><div className="wizard-progress-fill" style={{ width: `${pct}%` }} /></div>
            </div>

            {step === 0 && (
              <>
                <h2>apply to the challenge</h2>
                <p className="registration-lede">
                  Applications close on 31 October 2026, 11:59 pm IST. Have ready: your CIN or LLPIN, a deck link that opens
                  without a permission request, your revenue for each of the last six months, and a 2 to 5 minute video of the
                  founders. Your answers save in this browser as you type, so you can close this and come back on the same device.
                </p>
                <p className="app-fineprint">
                  Every question maps to a scoring criterion. <a href="#scoring">Read the eligibility checks and screening rubric ↗</a>
                </p>
                {phase === "before" && <p className="app-banner">You can start your draft now. Submissions open on 1 October 2026.</p>}
                {phase === "closed" && <p className="app-banner">Applications for the 2027 edition are closed.</p>}
              </>
            )}

            <form className="application-form" noValidate onSubmit={(e) => { e.preventDefault(); if (last) submit(); else next(); }}>
              <section className="application-section step-active" key={page.section}>
                <h3>{page.title}</h3>
                {page.help && <p className="app-section-help">{page.help}</p>}
                {page.questions.map((q) => {
                  const group = page.groups?.find((g) => g.before === (q.key ?? q.entry));
                  return (
                    <div key={q.entry}>
                      {group && (
                        <div className="app-group">
                          <h4>{group.title}</h4>
                          {group.help && <p>{group.help}</p>}
                        </div>
                      )}
                      <Field q={q} value={answers[q.entry]} error={errors[q.entry]} onChange={(v) => set(q, v)} onBlur={() => blurCheck(q)} />
                    </div>
                  );
                })}
              </section>

              <input ref={honeypot} className="app-hp" type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="wizard-nav step-active">
                <button type="button" className="wizard-back" onClick={back} disabled={step === 0}>← Back</button>
                <div className="wizard-nav-right">
                  <button type="button" className="wizard-save-exit" onClick={hide}>Save and close</button>
                  {last ? (
                    <button type="submit" className="button primary" disabled={status === "sending" || phase !== "open"}>
                      {status === "sending" ? "Sending…" : "Submit application ↗"}
                    </button>
                  ) : (
                    <button type="submit" className="button primary wizard-next">Continue →</button>
                  )}
                </div>
              </div>
              {status === "failed" && (
                <p className="auth-error" role="alert">
                  {failMsg || "That did not go through. Check your connection and press submit again. Your answers are still saved."}
                </p>
              )}
              {Object.keys(errors).length > 0 && (
                <p className="auth-error" role="alert">Some answers on this page need attention.</p>
              )}
            </form>
          </>
        )}
      </div>
    </aside>
  );
}

function Field({ q, value, error, onChange, onBlur }: { q: Question; value: Answers[string] | undefined; error?: string; onChange: (v: string | string[]) => void; onBlur: () => void }) {
  const id = `q-${q.entry}`;
  const req = q.required ? <span className="app-req" aria-hidden="true">{"\u00a0*"}</span> : null;
  const isUpload = q.entry === E.deck || q.entry === E.video;
  const help = q.help ? (
    <span className="app-help">
      {q.help}
      {isUpload && (
        <>
          {" "}
          <a href={GOOGLE_FORM_VIEW_URL} target="_blank" rel="noopener noreferrer">Open the official form <span aria-hidden="true">↗</span></a>
        </>
      )}
    </span>
  ) : null;

  if (q.kind === "radio" || q.kind === "checkbox") {
    const picked = q.kind === "radio" ? [text(value)] : list(value);
    return (
      <fieldset className={`app-field${error ? " has-error" : ""}`} id={id}>
        <legend>{q.title}{req}</legend>
        {help}
        <div className="app-choices">
          {q.choices!.map((c) => (
            <label key={c} className={`app-choice${picked.includes(c) ? " is-picked" : ""}`}>
              <input
                type={q.kind}
                name={q.entry}
                checked={picked.includes(c)}
                onChange={(e) => {
                  if (q.kind === "radio") onChange(c);
                  else onChange(e.target.checked ? [...list(value), c] : list(value).filter((x) => x !== c));
                }}
              />
              <span>
                {c === "I have read how applications are scored" ? (
                  <>I have read <a href="#scoring">how applications are scored</a></>
                ) : c}
              </span>
            </label>
          ))}
        </div>
        {error && <span className="app-error">{error}</span>}
      </fieldset>
    );
  }

  if (q.kind === "file") {
    const name = text(value);
    return (
      <div className={`app-field${error ? " has-error" : ""}`} id={id}>
        <label htmlFor={`${id}-input`}>{q.title}{req}</label>
        {help}
        <label className={`app-file${name ? " has-file" : ""}`}>
          <input
            id={`${id}-input`}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              DECK = e.target.files?.[0] ?? null;
              onChange(DECK ? DECK.name : "");
            }}
          />
          <span className="app-file-name">{name ? (DECK ? `${name} · ${DECK.size < 1048576 ? `${Math.max(1, Math.round(DECK.size / 1024))}KB` : `${(DECK.size / 1048576).toFixed(1)}MB`}` : `${name} (attach again)`) : "Choose a PDF"}</span>
          <span className="app-file-btn">{name ? "Replace" : "Browse"}</span>
        </label>
        <span className="app-meta">{error ? <span className="app-error">{error}</span> : <span />}</span>
      </div>
    );
  }

  const v = text(value);
  const common = {
    id: `${id}-input`,
    value: v,
    "aria-invalid": !!error,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onBlur,
  };
  return (
    <div className={`app-field${error ? " has-error" : ""}`} id={id}>
      <label htmlFor={common.id}>{q.title}{req}</label>
      {help}
      {q.kind === "paragraph" ? (
        <textarea {...common} rows={q.max && q.max > 500 ? 6 : 4} />
      ) : (
        <input
          {...common}
          type={q.kind === "email" ? "email" : q.kind === "url" ? "url" : q.kind === "phone" ? "tel" : "text"}
          inputMode={q.kind === "number" ? "numeric" : q.kind === "phone" ? "tel" : undefined}
          enterKeyHint="next"
          {...(q.kind === "email" || q.kind === "url" || q.key?.endsWith(".linkedin") || q.key?.endsWith(".x")
            ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false }
            : {})}
          placeholder={
            q.key?.endsWith(".linkedin") ? "https://www.linkedin.com/in/…" : q.key?.endsWith(".x") ? "https://x.com/…"
              : q.kind === "url" ? "https://" : q.kind === "number" ? "0" : q.kind === "email" ? "you@company.com" : q.kind === "phone" ? "98765 43210" : undefined
          }
          autoComplete={q.kind === "email" ? "email" : q.kind === "phone" ? "tel-national" : "off"}
        />
      )}
      <span className="app-meta">
        {error ? <span className="app-error">{error}</span> : <span />}
        {q.max ? <span className={`app-count${v.length > q.max ? " over" : ""}`}>{v.length} / {q.max}</span> : null}
      </span>
    </div>
  );
}


/**
 * Register: a short "before you apply" panel that hands off to the official Google Form,
 * where the deck is uploaded as a file. Any [data-register] element opens it; [data-track]
 * prefills the track on the Form.
 */
export function GoogleFormHandoff() {
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState<string | undefined>();
  const [phase, setPhase] = useState<"before" | "open" | "closed">("open");

  useEffect(() => {
    const now = Date.now();
    setPhase(now < new Date(APPLICATIONS_OPEN).getTime() ? "before" : now > new Date(APPLICATIONS_CLOSE).getTime() ? "closed" : "open");
  }, []);

  const show = useCallback((t?: string) => { setTrack(t); setOpen(true); lock(true); }, []);
  const hide = useCallback(() => {
    setOpen(false);
    lock(false);
    if (location.hash === "#register") { try { history.pushState({}, "", "#top"); } catch { /* ignore */ } }
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-register]");
      if (!el) return;
      e.preventDefault();
      try { history.pushState({}, "", "#register"); } catch { /* ignore */ }
      show(el.dataset.track);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.querySelector(".registration.open") && !document.querySelector(".detail.open")) hide();
    };
    const onPop = () => { if (location.hash === "#register") show(); else { setOpen(false); lock(false); } };
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    if (location.hash === "#register") show();
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
  }, [show, hide]);

  const formUrl = track
    ? `${GOOGLE_FORM_VIEW_URL}?usp=pp_url&${TRACK_ENTRY}=${encodeURIComponent(track)}`
    : GOOGLE_FORM_VIEW_URL;

  return (
    <aside className={`registration overlay${open ? " open" : ""}`} id="registration" aria-hidden={!open} data-lenis-prevent>
      <div className="registration-inner">
        <div className="registration-head">
          <span className="eyebrow">Application</span>
          <button className="close" type="button" onClick={hide}>Close ×</button>
        </div>
        <h2>apply to the challenge</h2>
        <p className="registration-lede">
          The application is on Google Forms. You will need to sign in with a Google account, because your pitch deck is
          uploaded as a file. Applications close on 31 October 2026, 11:59 pm IST.
        </p>
        {phase === "closed" ? (
          <p className="app-banner">Applications for the 2027 edition are closed.</p>
        ) : (
          <>
            <h3 className="handoff-h">Have these ready</h3>
            <ul className="handoff-list">
              <li>Your CIN, or LLPIN if you are an LLP</li>
              <li>Name, role, email, mobile and LinkedIn profile for every founder</li>
              <li>Your revenue for each of the last six months (0 is a valid answer)</li>
              <li>Your pitch deck as a PDF under 100MB, named CompanyName_FounderName_PitchDeck.pdf</li>
              <li>A 2 to 5 minute video of the founders, as a YouTube, Google Drive or Loom link</li>
            </ul>
            <p className="app-fineprint">
              It takes about 30 minutes, and answers cannot be edited once submitted.{" "}
              <a href="#scoring">Check eligibility and how applications are scored ↗</a>
            </p>
            <div className="handoff-actions">
              <a className="button primary" href={formUrl} target="_blank" rel="noopener noreferrer">
                {phase === "before" ? "Open the application form ↗" : "Start your application ↗"}
              </a>
              <a className="wizard-save-exit" href={gmailLink("Grand Startup Challenge application")} target="_blank" rel="noopener noreferrer">
                Questions? Email {CONTACT}
              </a>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
