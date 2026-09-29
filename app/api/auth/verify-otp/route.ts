import { db } from "@/lib/server/db";
import { OTP_MAX_ATTEMPTS, createSession, newId, otpMatches } from "@/lib/server/auth";
import { fail, json, readJson } from "@/lib/server/http";
import { normalisePhone } from "@/lib/server/validate";

export const dynamic = "force-dynamic";

// Step 2: check the OTP. On success the account is created (first time) and a
// session cookie is set, which unlocks the application form.
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return fail("Invalid request.");
  const phone = normalisePhone(body.phone);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!phone) return fail("Enter a valid 10-digit Indian mobile number.");
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code.");

  const q = await db();
  const [otp] = await q<{ id: string; email: string; code_hash: string; attempts: number; expires_at: Date }>(
    `select id, email, code_hash, attempts, expires_at from otp_requests
     where phone = $1 and consumed_at is null order by created_at desc limit 1`,
    [phone],
  );
  if (!otp || new Date(otp.expires_at).getTime() < Date.now()) return fail("This code has expired. Request a new one.", 410);
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return fail("Too many incorrect attempts. Request a new code.", 429);

  if (!otpMatches(otp.code_hash, phone, code)) {
    await q("update otp_requests set attempts = attempts + 1 where id = $1", [otp.id]);
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    return fail(left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Request a new code.", 401);
  }

  await q("update otp_requests set consumed_at = now() where id = $1", [otp.id]);

  let [user] = await q<{ id: string; email: string; phone: string }>("select id, email, phone from users where phone = $1", [phone]);
  let created = false;
  if (!user) {
    const [emailOwner] = await q("select 1 from users where email = $1", [otp.email]);
    if (emailOwner) return fail("This email is already registered with a different phone number.", 409);
    [user] = await q("insert into users (id, email, phone) values ($1, $2, $3) returning id, email, phone", [newId(), otp.email, phone]);
    await q("insert into applications (user_id) values ($1) on conflict do nothing", [user.id]);
    created = true;
  } else if (user.email !== otp.email) {
    const [emailOwner] = await q("select 1 from users where email = $1 and id <> $2", [otp.email, user.id]);
    if (!emailOwner) [user] = await q("update users set email = $1 where id = $2 returning id, email, phone", [otp.email, user.id]);
  }

  await createSession(user.id);
  return json({ ok: true, created, user: { email: user.email, phone: user.phone } });
}
