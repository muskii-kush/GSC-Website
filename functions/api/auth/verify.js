// Checks the founder's OTP on the server and signs them in. The answer also says
// whether this mobile number has already applied, so the site shows the right screen.
import { reply } from "../../_lib/applications";
import { OTP_API_URL, sessionCookie, sessionSecret, submittedFor } from "../../_lib/session";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return reply(false, "bad-request", "We could not read that. Please try again.", 400); }
  const phone = String(body?.phone || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  const otp = String(body?.otp || "").replace(/\D/g, "");
  if (!/^[6-9]\d{9}$/.test(phone)) return reply(false, "bad-phone", "Enter a valid 10-digit Indian mobile number.", 400);
  if (!/^\d{4,8}$/.test(otp)) return reply(false, "bad-otp", "Enter the code from your SMS.", 400);
  if (!sessionSecret(env)) return reply(false, "not-configured", "Sign-in is being switched on. Please try again shortly.", 503);

  try {
    const res = await fetch(`${env.OTP_API_URL || OTP_API_URL}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identifier: `+91${phone}`, otp }),
      signal: AbortSignal.timeout(10000),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok || !out || out.success === false || out.verified !== true) {
      const why = typeof out?.error === "string" ? out.error : out?.error?.message || out?.message;
      return reply(false, "otp-invalid", why || "That code is not right. Check the SMS and try again.", 401);
    }
  } catch {
    return reply(false, "otp-unavailable", "We could not check the code just now. Please try again in a minute.", 503);
  }

  const done = await submittedFor(phone, env).catch(() => null);
  const res = reply(true, "ok", "Verified.", 200, { phone, submitted: !!done, ...(done || {}) });
  res.headers.append("set-cookie", await sessionCookie(phone, env));
  return res;
}

export const onRequest = () => reply(false, "method-not-allowed", "Use POST.", 405);
