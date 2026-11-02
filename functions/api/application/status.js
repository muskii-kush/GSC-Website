import { reply } from "../../_lib/applications";
import { sessionPhone } from "../../_lib/session";
import { linkPhone, ownApplication, receipt } from "../../_lib/recovery";
import { normaliseRegNo } from "../../../lib/application-checks";

// A small request can recover a receipt after a lost upload response, without
// sending the PDF again. Hints stay in the POST body, out of query-string logs.
export async function onRequestPost({ request, env }) {
  const phone = await sessionPhone(request, env);
  if (!phone) return reply(false, "signed-out", "Verify your mobile number again. Your answers are still saved.", 401);
  if (!env.DECKS) return reply(false, "not-configured", "Application storage is unavailable. Please try again shortly.", 503);
  let body;
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || (body.email !== undefined && (typeof body.email !== "string" || body.email.length > 254)) || (body.cin !== undefined && (typeof body.cin !== "string" || body.cin.length > 30))) throw new Error("Invalid hints");
  } catch { return reply(false, "bad-request", "Could not check the application status.", 400); }
  try {
    const app = await ownApplication(phone, { email: body.email?.trim().toLowerCase(), cin: body.cin === undefined ? undefined : normaliseRegNo(body.cin) }, env);
    if (!app) return reply(false, "not-found", "No recorded application was found for your verified mobile number.", 404);
    await linkPhone(phone, app, env);
    return reply(true, "ok", "Application received.", 200, { ...receipt(app), recovered: true });
  } catch {
    console.error(JSON.stringify({ event: "application-receipt-check-failed" }));
    return reply(false, "status-unavailable", "We could not confirm receipt just now. Your answers are still saved.", 503);
  }
}

export const onRequest = () => reply(false, "method-not-allowed", "Use POST.", 405);
