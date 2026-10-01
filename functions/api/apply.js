// Cloudflare Pages Function: POST /api/apply
//
// Receives an application from the website form (multipart: "payload" JSON + "deck" PDF),
//   1. stores the deck in R2 under an unguessable id, so the copy we review can never change,
//   2. submits every answer to the Google Form, with the deck's link in the "Pitch deck link" question,
//   3. returns { ok, code, message } so the site can tell the founder exactly what happened,
//   4. refuses a second application with the same email or CIN/LLPIN (KV).
//
// Bindings (Cloudflare dashboard > Pages project > Settings > Functions):
//   R2 bucket  -> variable name DECKS
//   KV         -> variable name APPLICANTS   (optional, enables the duplicate check)
// Environment variable (optional):
//   DECK_LINK_SECRET -> any long random string; required in deck links when set (see deck/[[path]].js)

const FORM_ID = "1FAIpQLSe7uI5-KB-8DN-TtK8S6fjeqLjCn8rH62kORvhx2F8sC84rUg";
const DECK_ENTRY = "entry.1771685276"; // "Pitch deck link" (short answer) on the live Form
const CIN_ENTRY = "entry.1619968075";
const MAX_DECK_BYTES = 50 * 1024 * 1024;
const CONFIRMATION = ["has been received", "Your response has been recorded", "freebirdFormviewerViewResponseConfirmationMessage"];

const reply = (ok, code, message, status = 200) =>
  new Response(JSON.stringify({ ok, code, message }), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const safeName = (n) => {
  const clean = String(n || "PitchDeck.pdf").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(0, 120);
  return /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;
};

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(false, "bad-request", "We could not read the application. Please try again.", 400);
  }

  let payload;
  try {
    payload = JSON.parse(String(form.get("payload") || "{}"));
  } catch {
    return reply(false, "bad-request", "We could not read the application. Please try again.", 400);
  }
  const fields = Array.isArray(payload.fields) ? payload.fields.filter((f) => Array.isArray(f) && f.length === 2) : [];
  const email = String(payload.email || "").trim().toLowerCase();
  const cin = String((fields.find((f) => f[0] === CIN_ENTRY) || [])[1] || "").trim().toUpperCase();
  const deck = form.get("deck");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return reply(false, "missing-email", "A valid email address is required.");
  if (!deck || typeof deck === "string") return reply(false, "missing-deck", "Please attach your pitch deck as a PDF.");
  if (deck.size > MAX_DECK_BYTES) return reply(false, "deck-too-large", "The deck must be 50MB or smaller.");
  if (deck.size < 10 * 1024) return reply(false, "deck-empty", "This file looks empty. Please attach your full deck.");

  const bytes = await deck.arrayBuffer();
  const head = new TextDecoder().decode(new Uint8Array(bytes.slice(0, 5)));
  if (!head.startsWith("%PDF")) return reply(false, "deck-not-pdf", "The deck must be a PDF file.");

  // One application per email and per company.
  if (env.APPLICANTS) {
    if (await env.APPLICANTS.get(`email:${email}`)) return reply(false, "duplicate", "An application with this email has already been submitted.");
    if (cin && (await env.APPLICANTS.get(`cin:${cin}`))) return reply(false, "duplicate", "An application for this company (CIN or LLPIN) has already been submitted.");
  }

  if (!env.DECKS) return reply(false, "not-configured", "Applications are being switched on. Your answers are saved; please try again shortly.", 503);

  // 1. Store the deck.
  const id = crypto.randomUUID();
  const name = safeName(payload.deckName || deck.name);
  const key = `${id}/${name}`;
  await env.DECKS.put(key, bytes, {
    httpMetadata: { contentType: "application/pdf", contentDisposition: `inline; filename="${name}"` },
    customMetadata: { email, cin, submittedAt: new Date().toISOString() },
  });
  const origin = new URL(request.url).origin;
  const deckUrl = `${origin}/api/deck/${key}${env.DECK_LINK_SECRET ? `?k=${encodeURIComponent(env.DECK_LINK_SECRET)}` : ""}`;

  // 2. Submit to the Google Form.
  const body = new URLSearchParams();
  for (const [k, v] of fields) body.append(String(k), String(v));
  body.append("emailAddress", email);
  body.append(DECK_ENTRY, deckUrl);
  body.append("fvv", "1");
  if (payload.pageHistory) body.append("pageHistory", String(payload.pageHistory));

  let accepted = false;
  try {
    const res = await fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      redirect: "follow",
    });
    const html = await res.text();
    accepted = res.status === 200 && CONFIRMATION.some((t) => html.includes(t));
    if (!accepted) console.error("Form rejected the submission", res.status, html.slice(0, 1500));
  } catch (err) {
    console.error("Form request failed", err);
  }
  if (!accepted) {
    await env.DECKS.delete(key);
    return reply(false, "form-rejected", "We could not record the application. Please check your answers and try again, or write to grandstartupchallenge@cars24.com.");
  }

  // 3. Remember this applicant.
  if (env.APPLICANTS) {
    const at = new Date().toISOString();
    await env.APPLICANTS.put(`email:${email}`, at);
    if (cin) await env.APPLICANTS.put(`cin:${cin}`, at);
  }
  return reply(true, "ok", "Application received.");
}

export const onRequest = () => reply(false, "method-not-allowed", "Use POST.", 405);
