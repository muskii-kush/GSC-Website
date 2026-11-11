import { reply } from "../../_lib/applications";
import { sessionPhone } from "../../_lib/session";
import { linkPhone, ownApplication, receipt, submissionPending } from "../../_lib/recovery";
import { normaliseRegNo } from "../../../lib/application-checks";
import { applicationEndpoint } from "../../_lib/request-diagnostics";

// A small request can recover a receipt after a lost upload response, without
// sending the PDF again. Hints stay in the POST body, out of query-string logs.
async function checkStatus({ request, env }, requestId, log) {
  const phone = await log.step("verify-session", () => sessionPhone(request, env));
  if (!phone) return reply(false, "signed-out", "Verify your mobile number again. Your answers are still saved.", 401);
  log.allowArchive();
  if (!env.DECKS) return reply(false, "not-configured", "Application storage is unavailable. Please try again shortly.", 503);
  let body;
  try {
    body = await log.step("parse-status-request", () => request.json());
    if (!body || typeof body !== "object" || (body.email !== undefined && (typeof body.email !== "string" || body.email.length > 254)) || (body.cin !== undefined && (typeof body.cin !== "string" || body.cin.length > 30))) throw new Error("Invalid hints");
  } catch { return reply(false, "bad-request", "Could not check the application status.", 400); }
  try {
    const app = await ownApplication(phone, { email: body.email?.trim().toLowerCase(), cin: body.cin === undefined ? undefined : normaliseRegNo(body.cin) }, env, log);
    if (!app) {
      if (await log.step("check-processing-reservation", () => submissionPending(phone, env))) {
        log.info("application-receipt-pending", { outcome: "processing" });
        const response = reply(false, "submission-in-progress", "Your earlier submission is still being recorded. Please check status again shortly.", 202);
        response.headers.set("retry-after", "2");
        return response;
      }
      log.info("application-receipt-absent", { outcome: "not-found" });
      return reply(false, "not-found", "No recorded application was found for your verified mobile number.", 404);
    }
    await log.step("repair-phone-index", () => linkPhone(phone, app, env), { applicationId: app.applicationId });
    return reply(true, "ok", "Application received.", 200, { ...receipt(app), recovered: true });
  } catch (error) {
    log.error("application-receipt-check-failed", error);
    return reply(false, "status-unavailable", "We could not confirm receipt just now. Your answers are still saved.", 503);
  }
}

export const onRequestPost = applicationEndpoint("status", checkStatus);

export const onRequest = applicationEndpoint("status", () => reply(false, "method-not-allowed", "Use POST.", 405));
