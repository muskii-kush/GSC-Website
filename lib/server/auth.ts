import "server-only";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_PER_PHONE_PER_HOUR = 5;
export const OTP_MAX_PER_IP_PER_HOUR = 20;

const SESSION_COOKIE = "gsc_session";
const SESSION_DAYS = 30;

function otpSecret(): string {
  const secret = process.env.OTP_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("OTP_SECRET is not set.");
  return "dev-only-otp-secret";
}

export const newOtpCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const hashOtp = (phone: string, code: string) => createHmac("sha256", otpSecret()).update(`${phone}:${code}`).digest("hex");

export function otpMatches(hash: string, phone: string, code: string): boolean {
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(hashOtp(phone, code), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const q = await db();
  await q("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [hashToken(token), userId, expires]);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export type User = { id: string; email: string; phone: string };

export async function currentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const q = await db();
  const rows = await q<User>(
    "select u.id, u.email, u.phone from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()",
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    const q = await db();
    await q("delete from sessions where token_hash = $1", [hashToken(token)]);
  }
  cookies().delete(SESSION_COOKIE);
}

export const newId = () => randomUUID();
