"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GOOGLE_FORM_VIEW_URL, INELIGIBLE, MAX_DECK_BYTES, PENDING, SUBMIT_URL, pages, type Page, type Question } from "@/lib/application-form";
import {
  E, checkApplication, checkFounders, normalise,
} from "@/lib/application-checks";
import { APPLICATIONS_CLOSE, APPLICATIONS_OPEN, CONTACT, gmailLink } from "@/lib/content";
import RegistrationAuth from "@/components/RegistrationAuth";
import { BY_KEY, validateAnswer, visiblePages } from "@/lib/application-validation";

/**
 * The application, in the site's own design. Answers autosave in this browser
 * as the founder types; on submit the receiver records all answers and the PDF
 * in private storage before confirming receipt.
 *
 * Any element with [data-register] opens it. [data-track="<choice>"] on that
 * element preselects the track.
 */

type Answers = Record<string, string | string[]>;
type Draft = { answers: Answers; step: number; submissionId?: string; submittedAt?: string };

const DRAFT_KEY = "gsc-application-v3";
const TRACK_ENTRY = "entry.1532659170";

/** Drafts are kept per verified mobile number, so two founders on one computer never see each other's answers. */
const draftKey = (phone: string) => `${DRAFT_KEY}:${phone}`;
function loadDraft(phone: string): Draft | null {
  try {
    const own = localStorage.getItem(draftKey(phone));
    if (own) return JSON.parse(own);
    // A draft started before sign-in was per number: hand it to the first number that verifies here.
    const legacy = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as Draft | null;
    localStorage.removeItem(DRAFT_KEY);
    return legacy && !legacy.submittedAt ? legacy : null;
  } catch { return null; }
}
function saveDraft(phone: string, d: Draft) {
  try { localStorage.setItem(draftKey(phone), JSON.stringify(d)); } catch { /* storage blocked: the form still works */ }
}

function lock(on: boolean) {
  if (!on && document.querySelector(".detail.open")) return;
  document.documentElement.classList.toggle("is-locked", on);
  window.dispatchEvent(new CustomEvent("gsc:lock", { detail: on }));
}

const text = (v: Answers[string] | undefined) => (typeof v === "string" ? v : "");
const list = (v: Answers[string] | undefined) => (Array.isArray(v) ? v : []);

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
  return q.kind === "file" ? checkDeckFile(!!text(v)) : validateAnswer(q, v, answers);
}

const PARAGRAPHS = pages.flatMap((p) => p.questions.filter((q) => q.kind === "paragraph").map((q) => q.entry));


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
 * at /api/apply (functions/api/apply.js), which records the complete application and deck in R2.
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
  /** The mobile number verified by OTP on the server; empty until then. */
  const [phone, setPhone] = useState("");
  const phoneVerified = !!phone;
  const panel = useRef<HTMLElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const submissionId = useRef("");

  const shown = useMemo(() => visiblePages(answers), [answers]);
  const page = shown[Math.min(step, shown.length - 1)];
  const last = step >= shown.length - 1;

  // A saved draft can point past the end, e.g. when a changed answer hides a conditional
  // section. Pull the step back so the counter and Back button stay right.
  useEffect(() => {
    if (step > shown.length - 1) setStep(shown.length - 1);
  }, [step, shown.length]);

  useEffect(() => { setPhase(windowState()); }, []);

  /** After OTP: the server says whether this number has applied; otherwise open this number's own draft. */
  const signIn = (verified: string, done?: { submittedAt?: string }) => {
    const d = loadDraft(verified);
    submissionId.current = d?.submissionId || crypto.randomUUID();
    setAnswers({ ...(d?.answers || {}), [BY_KEY.phone]: verified });
    setStep(d?.step || 0);
    setErrors({});
    setStopped(null);
    setFailMsg("");
    setSubmittedAt(done ? done.submittedAt || d?.submittedAt || new Date().toISOString() : undefined);
    setStatus(done ? "sent" : "idle");
    setPhone(verified);
    setLoaded(true);
  };

  /** "Not you?": sign out so the next person starts from the mobile number screen. */
  const signOut = async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* the cookie also expires on its own */ }
    setLoaded(false);
    setPhone("");
    setAnswers({});
    setStep(0);
    setErrors({});
    setStopped(null);
    setStatus("idle");
    setSubmittedAt(undefined);
    DECK = null;
    toTop();
  };

  // Autosave on every change, under the signed-in number.
  useEffect(() => {
    if (loaded && phone) saveDraft(phone, { answers, step, submissionId: submissionId.current, submittedAt });
  }, [answers, step, submittedAt, loaded, phone]);

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
    // records the full application and its deck together.
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
        submissionId: submissionId.current,
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
        if (out.code === "already-submitted") {
          DECK = null;
          setSubmittedAt(out.submittedAt || new Date().toISOString());
          setStatus("sent");
          toTop();
          return;
        }
        if (out.code === "signed-out") {
          setLoaded(false);
          setPhone("");
          setStatus("idle");
          toTop();
          return;
        }
        if (typeof out.entry === "string") {
          const at = shown.findIndex((p) => p.questions.some((q) => q.entry === out.entry));
          if (at >= 0) { setStep(at); setErrors({ [out.entry]: out.message }); focusError(out.entry); }
        }
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

        {phoneVerified && (
          <p className="app-signed-in">
            Signed in as <strong>+91 {phone.slice(0, 5)} {phone.slice(5)}</strong>
            <button type="button" onClick={signOut}>Not you? Use a different number</button>
          </p>
        )}

        {!phoneVerified ? (
          open ? <RegistrationAuth onVerified={(verified, done) => { signIn(verified, done); toTop(); }} /> : null
        ) : status === "sent" ? (
          <div className="app-done">
            <h2>{submittedAt && Date.now() - new Date(submittedAt).getTime() > 5 * 60_000 ? "you have already applied" : "application received"}</h2>
            <p className="registration-lede">
              {submittedAt && <>Submitted on {new Date(submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. </>}
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
                <span className="wizard-progress-pct">Saved on this device</span>
              </div>
              <div className="wizard-progress-track"><div className="wizard-progress-fill" style={{ width: `${pct}%` }} /></div>
            </div>

            {step === 0 && (
              <>
                <h2>apply to the challenge</h2>
                <p className="registration-lede">
                  Applications close on 10 November 2026, 11:59 pm IST. Have ready: your CIN or LLPIN, a deck link that opens
                  without a permission request, your revenue for each of the last six months, and a 2 to 5 minute video of the
                  founders. Your answers save on this device as you type, so you can close this and come back later by verifying the same mobile number here.
                </p>
                <p className="app-fineprint">
                  Every question maps to a scoring criterion. <a href="#scoring">Read the eligibility checks and screening rubric ↗</a>
                </p>
                {phase === "before" && <p className="app-banner">You can start your draft now. Submissions open on 9 October 2026.</p>}
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
                      <Field q={q} value={answers[q.entry]} error={errors[q.entry]} onChange={(v) => set(q, v)} onBlur={() => blurCheck(q)} locked={q.key === "phone"} />
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

function Field({ q, value, error, onChange, onBlur, locked }: { q: Question; value: Answers[string] | undefined; error?: string; onChange: (v: string | string[]) => void; onBlur: () => void; locked?: boolean }) {
  const id = `q-${q.entry}`;
  const req = q.required ? <span className="app-req" aria-hidden="true">{"\u00a0*"}</span> : null;
  const help = locked
    ? <span className="app-help">The number you verified with the one-time code. To use another number, choose “Not you?” at the top.</span>
    : q.help ? <span className="app-help">{q.help}</span> : null;

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
          readOnly={locked}
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
          uploaded as a file. Applications close on 10 November 2026, 11:59 pm IST.
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
