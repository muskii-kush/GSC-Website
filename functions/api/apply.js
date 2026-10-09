// R2 records the complete application and PDF. Sheet delivery cannot discard it.
import { pages } from "../../lib/application-questions";
import { E, checkApplication, checkFounders, normalise } from "../../lib/application-checks";
import { BY_KEY, validateAnswer, visiblePages } from "../../lib/application-validation";
import { applicationKey, deliverApplication, reply } from "../_lib/applications";

const MAX_DECK_BYTES = 50 * 1024 * 1024;
const QUESTIONS = new Map(pages.flatMap((p) => p.questions).map((q) => [q.entry, q]));
const safeName = (n) => {
  const clean = String(n || "PitchDeck.pdf").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(0, 120);
  return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
};
const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
  .map((x) => x.toString(16).padStart(2, "0")).join("");

export async function onRequestPost(context) {
  const { request, env } = context;
  let form, payload;
  try {
    form = await request.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string" || raw.length > 100_000) throw new Error("Invalid payload");
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.fields) || payload.fields.length > 100) throw new Error("Invalid fields");
  } catch {
    return reply(false, "bad-request", "We could not read the application. Please try again.", 400);
  }

  // Google now requires interactive reCAPTCHA. Validate with the browser's shared rules.
  const answers = { emailAddress: typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "" };
  for (const pair of payload.fields) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[1] !== "string") return reply(false, "bad-request", "The application contains an invalid answer.", 400);
    const [entry, value] = pair, q = QUESTIONS.get(entry);
    if (!q || q.kind === "file" || entry === "emailAddress") return reply(false, "bad-request", "The application contains an unknown question. Please reload and try again.", 400);
    if (q.kind === "checkbox") (answers[entry] ||= []).push(value);
    else {
      if (answers[entry] !== undefined) return reply(false, "bad-request", "The application contains a repeated question.", 400);
      answers[entry] = normalise(entry, value, q.key);
    }
  }
  const shown = visiblePages(answers);
  for (const q of shown.flatMap((p) => p.questions)) {
    const error = validateAnswer(q, answers[q.entry], answers);
    if (error) return reply(false, "invalid-answer", `${q.title}: ${error}`, 422, { entry: q.entry });
    if (q.stop?.includes(answers[q.entry])) return reply(false, "ineligible", "This application does not meet the eligibility rules.", 422);
  }
  const crossCheck = checkFounders(answers, BY_KEY) || checkApplication(answers, shown.flatMap((p) => p.questions.filter((q) => q.kind === "paragraph").map((q) => q.entry)));
  if (crossCheck) return reply(false, "invalid-answer", crossCheck.message, 422, { entry: crossCheck.entry });

  const email = answers.emailAddress, cin = answers[E.cin], deck = form.get("deck");
  if (!deck || typeof deck === "string") return reply(false, "missing-deck", "Please attach your pitch deck as a PDF.", 422);
  if (deck.size > MAX_DECK_BYTES) return reply(false, "deck-too-large", "The deck must be 50MB or smaller.", 422);
  if (deck.size < 10 * 1024) return reply(false, "deck-empty", "This file looks empty. Please attach your full deck.", 422);
  if (!env.DECKS) return reply(false, "not-configured", "Applications are being switched on. Your answers are saved; please try again shortly.", 503);
  if (!new TextDecoder().decode(await deck.slice(0, 5).arrayBuffer()).startsWith("%PDF")) return reply(false, "deck-not-pdf", "The deck must be a PDF file.", 422);

  const id = crypto.randomUUID();
  const submissionId = typeof payload.submissionId === "string" && /^[0-9a-f-]{36}$/i.test(payload.submissionId) ? payload.submissionId : null;
  const submittedAt = new Date().toISOString(), claimed = [];
  const leaseExpiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  let deckKey, recorded = false;
  try {
    // Preserve checks for applications accepted before this change.
    if (env.APPLICANTS && (await env.APPLICANTS.get(`email:${email}`) || await env.APPLICANTS.get(`cin:${cin}`))) {
      if (!await env.DECKS.head(`applicants/email/${await hash(email)}.json`)) return reply(false, "duplicate", "An application with this email or company has already been submitted.", 409);
    }
    // Conditional R2 writes stop simultaneous submissions by the same email/company.
    for (const [kind, value] of [["email", email], ["cin", cin]]) {
      const key = `applicants/${kind}/${await hash(value)}.json`;
      const identity = JSON.stringify({ applicationId: id, submissionId, submittedAt, leaseExpiresAt });
      let claim = await env.DECKS.put(key, identity, { onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/json" } });
      if (!claim) {
        const existing = await env.DECKS.get(key), owner = existing ? await existing.json() : null;
        const previous = owner ? await env.DECKS.head(applicationKey(owner.applicationId)) : null;
        if (submissionId && owner?.submissionId === submissionId && previous) return reply(true, "ok", "Application received.", 200, { applicationId: owner.applicationId });
        // Recover a reservation abandoned by a terminated request. Recorded applications
        // remain permanent duplicates; only an expired claim without a record can be replaced.
        if (!previous && owner?.leaseExpiresAt && new Date(owner.leaseExpiresAt).getTime() < Date.now()) {
          claim = await env.DECKS.put(key, identity, { onlyIf: { etagMatches: existing.etag }, httpMetadata: { contentType: "application/json" } });
        }
        if (!claim) return reply(false, previous ? "duplicate" : "submission-in-progress", previous ? "An application with this email or company has already been submitted." : "Your application is still being recorded. Please try again in a moment.", previous ? 409 : 503);
      }
      claimed.push(key);
    }
    const name = safeName(payload.deckName || deck.name);
    deckKey = `${id}/${name}`;
    await env.DECKS.put(deckKey, deck, { httpMetadata: { contentType: "application/pdf", contentDisposition: `inline; filename="${name}"` }, customMetadata: { email, cin, submittedAt } });
    const deckUrl = `${new URL(request.url).origin}/api/deck/${deckKey}${env.DECK_LINK_SECRET ? `?k=${encodeURIComponent(env.DECK_LINK_SECRET)}` : ""}`;
    const application = {
      version: 1, applicationId: id, submissionId, submittedAt, email, cin, company: answers[E.company],
      deck: { key: deckKey, name, size: deck.size, url: deckUrl },
      answers: shown.flatMap((p) => p.questions.filter((q) => q.kind !== "file").map((q) => ({ entry: q.entry, title: q.title, value: answers[q.entry] ?? "" }))),
      delivery: { status: "pending", reason: env.APPLICATION_SYNC_URL && env.APPLICATION_SYNC_SECRET ? "queued" : "not-configured" },
    };
    await env.DECKS.put(applicationKey(id), JSON.stringify(application), { httpMetadata: { contentType: "application/json" }, customMetadata: { submittedAt } });
    recorded = true;
    console.log(JSON.stringify({ event: "application-recorded", applicationId: id }));
    const finish = async () => {
      if (env.APPLICANTS) {
        try { await env.APPLICANTS.put(`email:${email}`, submittedAt); await env.APPLICANTS.put(`cin:${cin}`, submittedAt); }
        catch { console.error(JSON.stringify({ event: "applicant-index-failed", applicationId: id })); }
      }
      await deliverApplication(application, env);
    };
    if (context.waitUntil) context.waitUntil(finish()); else await finish();
    return reply(true, "ok", "Application received.", 200, { applicationId: id });
  } catch {
    console.error(JSON.stringify({ event: "application-storage-failed", applicationId: id, recorded }));
    if (recorded) return reply(true, "ok", "Application received.", 200, { applicationId: id });
    return reply(false, "storage-unavailable", "We could not save the application. Your answers are still saved in this browser; please try again shortly.", 503);
  } finally {
    if (!recorded) {
      try {
        if (Date.now() < new Date(leaseExpiresAt).getTime() && claimed.length) await env.DECKS.delete(claimed);
        if (deckKey) await env.DECKS.delete(deckKey);
      }
      catch { console.error(JSON.stringify({ event: "application-cleanup-failed", applicationId: id })); }
    }
  }
}

export const onRequest = () => reply(false, "method-not-allowed", "Use POST.", 405);
