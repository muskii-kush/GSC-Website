import { db } from "@/lib/server/db";
import {
  OTP_MAX_PER_IP_PER_HOUR, OTP_MAX_PER_PHONE_PER_HOUR, OTP_RESEND_SECONDS, OTP_TTL_MINUTES, hashOtp, newId, newOtpCode,
} from "@/lib/server/auth";
import { clientIp, fail, json, readJson } from "@/lib/server/http";
import { shouldEchoOtp, smsProvider } from "@/lib/server/sms";
import { maskPhone, normaliseEmail, normalisePhone } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

// Step 1 of registration: take email + phone, send a 6-digit OTP to the phone.
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("Invalid request.");
  const email = normaliseEmail(body.email);
  const phone = normalisePhone(body.phone);
  if (!email) return fail("Enter a valid email address.");
  if (!phone) return fail("Enter a valid 10-digit Indian mobile number.");

  const q = await db();

  // The same email cannot be attached to a second phone number.
  const [emailOwner] = await q<{ phone: string }>("select phone from users where email = $1", [email]);
  if (emailOwner && emailOwner.phone !== phone) {
    return fail("This email is already registered with a different phone number.", 409);
  }

  const ip = clientIp(req);
  const [limits] = await q<{ last: Date | null; phone_hour: number; ip_hour: number }>(
    `select
       (select max(created_at) from otp_requests where phone = $1) as last,
       (select count(*)::int from otp_requests where phone = $1 and created_at > now() - interval '1 hour') as phone_hour,
       (select count(*)::int from otp_requests where ip = $2 and created_at > now() - interval '1 hour') as ip_hour`,
    [phone, ip],
  );
  if (limits.last) {
    const wait = OTP_RESEND_SECONDS - Math.floor((Date.now() - new Date(limits.last).getTime()) / 1000);
    if (wait > 0) return fail(`Please wait ${wait}s before requesting another code.`, 429);
  }
  if (limits.phone_hour >= OTP_MAX_PER_PHONE_PER_HOUR || limits.ip_hour >= OTP_MAX_PER_IP_PER_HOUR) {
    return fail("Too many codes requested. Try again in an hour.", 429);
  }

  const code = newOtpCode();
  const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  // Only the newest code for a phone is valid.
  await q("update otp_requests set consumed_at = now() where phone = $1 and consumed_at is null", [phone]);
  await q(
    "insert into otp_requests (id, phone, email, code_hash, ip, expires_at) values ($1, $2, $3, $4, $5, $6)",
    [newId(), phone, email, hashOtp(phone, code), ip, expires],
  );

  const provider = smsProvider();
  try {
    await provider.sendOtp(phone, code);
  } catch (err) {
    console.error("[send-otp] SMS delivery failed", err);
    return fail("Could not send the code. Please try again.", 502);
  }

  return json({
    ok: true,
    phone: maskPhone(phone),
    expiresInSeconds: OTP_TTL_MINUTES * 60,
    resendInSeconds: OTP_RESEND_SECONDS,
    ...(shouldEchoOtp(provider) ? { devCode: code } : {}),
  });
}
