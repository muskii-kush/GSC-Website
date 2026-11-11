import { createLogger } from "./logger";

export const applicationKey = (id) => `applications/${id}.json`;
export const reply = (ok, code, message, status = 200, extra = {}) => new Response(JSON.stringify({ ok, code, message, ...extra }), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store", "x-gsc-result-code": code,
    ...(typeof extra.entry === "string" && /^(entry\.\d+|emailAddress|deck)$/.test(extra.entry) ? { "x-gsc-error-field": extra.entry } : {}) },
});

// Authenticated Apps Script -> Sheets. Undelivered records remain in R2 for replay.
export async function deliverApplication(application, env, logger) {
  const log = logger || createLogger({ endpoint: "delivery", applicationId: application.applicationId, background: true });
  if (!env.APPLICATION_SYNC_URL || !env.APPLICATION_SYNC_SECRET) {
    log.info("application-delivery-skipped", { service: "sheet-push", reason: env.SHEET_KEY ? "csv-export-enabled" : "not-configured" });
    return application;
  }
  let upstreamStatus;
  try {
    const url = new URL(env.APPLICATION_SYNC_URL);
    if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error("Invalid receiver URL");
    const response = await log.step("sheet-delivery", () => fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.APPLICATION_SYNC_SECRET, application }),
      signal: AbortSignal.timeout(15000), redirect: "follow",
    }), { service: "sheet-push" });
    upstreamStatus = response.status;
    const result = await log.step("sheet-delivery-response", () => response.json(), { upstreamStatus });
    if (!response.ok || !result?.ok || result.applicationId !== application.applicationId) throw new Error("Receiver rejected application");
    application.delivery = { status: "delivered", at: new Date().toISOString() };
    log.info("application-delivered", { service: "sheet-push", upstreamStatus });
  } catch (error) {
    application.delivery = { status: "pending", reason: "receiver-unavailable", attemptedAt: new Date().toISOString() };
    log.error("application-delivery-pending", error, { service: "sheet-push", upstreamStatus, recorded: true });
  }
  try { await log.step("save-delivery-status", () => env.DECKS.put(applicationKey(application.applicationId), JSON.stringify(application), { httpMetadata: { contentType: "application/json" } })); }
  catch (error) { log.error("application-delivery-status-failed", error, { recorded: true }); }
  return application;
}
