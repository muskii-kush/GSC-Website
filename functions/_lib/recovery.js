import { applicationKey } from "./applications";
import { phoneKey } from "./session";
import { reference } from "./confirmation";

const enc = new TextEncoder();
const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value)))).map((n) => n.toString(16).padStart(2, "0")).join("");
export const identityKey = async (kind, value) => `applicants/${kind}/${await hash(value)}.json`;

function normalisePhone(value) {
  const phone = String(value || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(phone) ? phone : null;
}
export const applicationPhone = (app) => normalisePhone(app.phone) || normalisePhone(app.answers?.find((answer) => answer.entry === "entry.893177443")?.value);
export const receipt = (app) => ({ applicationId: app.applicationId, reference: reference(app.applicationId), submittedAt: app.submittedAt });

export function reservationExpired(owner, object) {
  const explicit = Date.parse(owner?.leaseExpiresAt);
  const started = Date.parse(owner?.submittedAt);
  const uploaded = object?.uploaded?.getTime();
  const expires = Number.isFinite(explicit) ? explicit : Number.isFinite(started) ? started + 15 * 60_000 : Number.isFinite(uploaded) ? uploaded + 15 * 60_000 : Infinity;
  return expires < Date.now();
}

/** Only the verified phone's own live reservation can report processing status. */
export async function submissionPending(phone, env) {
  const object = await env.DECKS.get(await phoneKey(phone));
  const owner = object && await object.json();
  return !!(owner?.applicationId && !reservationExpired(owner, object) && !await env.DECKS.head(applicationKey(owner.applicationId)));
}

/** Locate receipts using existing indexes, including applications from before OTP sign-in.
 * An email, CIN or browser submission ID alone never authorises access to an application.
 */
export async function ownApplication(phone, hints, env, log) {
  if (!env.DECKS) return null;
  const step = (stage, operation, fields) => log ? log.step(stage, operation, fields) : operation();
  const keys = [["phone", await phoneKey(phone)]];
  if (hints.email) keys.push(["email", await identityKey("email", hints.email)]);
  if (hints.cin) keys.push(["cin", await identityKey("cin", hints.cin)]);
  for (const [kind, key] of keys) {
    const index = await step("read-receipt-index", () => env.DECKS.get(key), { kind });
    const owner = index && await step("parse-receipt-index", () => index.json(), { kind });
    if (!owner?.applicationId) continue;
    const object = await step("read-receipt-archive", () => env.DECKS.get(applicationKey(owner.applicationId)), { kind });
    if (!object) continue;
    const app = await step("parse-receipt-archive", () => object.json(), { kind });
    if (applicationPhone(app) === phone) {
      log?.info("application-receipt-found", { applicationId: app.applicationId, source: kind, recovered: true });
      return app;
    }
  }
  return null;
}

/** Backfill the phone index only after checking the number saved on the application. */
export async function linkPhone(phone, app, env, heldBy) {
  if (applicationPhone(app) !== phone) throw new Error("Application belongs to another number");
  const key = await phoneKey(phone), object = await env.DECKS.get(key);
  const owner = object && await object.json();
  if (owner?.applicationId === app.applicationId) return;
  if (owner?.applicationId && owner.applicationId !== heldBy) {
    if (await env.DECKS.head(applicationKey(owner.applicationId)) || !reservationExpired(owner, object)) throw new Error("Phone reservation is in use");
  }
  const stored = await env.DECKS.put(key, JSON.stringify({ applicationId: app.applicationId, submissionId: app.submissionId, submittedAt: app.submittedAt }), {
    onlyIf: object ? { etagMatches: object.etag } : { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/json" },
  });
  if (!stored) {
    const latest = await env.DECKS.get(key);
    if (!latest || (await latest.json()).applicationId !== app.applicationId) throw new Error("Phone reservation changed");
  }
}
