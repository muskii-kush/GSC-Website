// Signed sign-in for applicants. The OTP is checked here, on the server, so the
// mobile number on an application is one the founder actually received a code on.
// The browser only ever holds an HttpOnly cookie: "<phone>.<expiry>.<signature>".
import { applicationKey } from "./applications";

export const OTP_API_URL = "https://api.cars24.com/gw/plt/bffsvc/api/v1/otp";
const COOKIE = "gsc_session";
const TTL_SECONDS = 12 * 60 * 60;
const enc = new TextEncoder();

/** A dedicated SESSION_SECRET is preferred; an existing private secret keeps sign-in working if it is not set yet. */
export const sessionSecret = (env) => env.SESSION_SECRET || env.DECK_LINK_SECRET || env.APPLICATION_SYNC_SECRET || env.SHEET_KEY || "";

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sign(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
const hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(value))))
  .map((x) => x.toString(16).padStart(2, "0")).join("");

export async function sessionCookie(phone, env) {
  const body = `${phone}.${Math.floor(Date.now() / 1000) + TTL_SECONDS}`;
  return `${COOKIE}=${body}.${await sign(sessionSecret(env), body)}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL_SECONDS}`;
}
export const clearedCookie = `${COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

/** The verified 10-digit mobile number for this request, or null. */
export async function sessionPhone(request, env) {
  const secret = sessionSecret(env);
  if (!secret) return null;
  const raw = (request.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const m = raw?.match(/^([6-9]\d{9})\.(\d{10})\.([A-Za-z0-9_-]{43})$/);
  if (!m || Number(m[2]) * 1000 < Date.now()) return null;
  const expected = await sign(secret, `${m[1]}.${m[2]}`);
  let diff = expected.length ^ m[3].length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ m[3].charCodeAt(i);
  return diff === 0 ? m[1] : null;
}

export const phoneKey = async (phone) => `applicants/phone/${await hash(phone)}.json`;

/** The recorded application for this mobile number, if there is one. */
export async function submittedFor(phone, env) {
  if (!env.DECKS) return null;
  const existing = await env.DECKS.get(await phoneKey(phone));
  const owner = existing ? await existing.json().catch(() => null) : null;
  if (!owner?.applicationId || !await env.DECKS.head(applicationKey(owner.applicationId))) return null;
  return { applicationId: owner.applicationId, submittedAt: owner.submittedAt };
}
