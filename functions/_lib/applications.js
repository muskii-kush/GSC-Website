export const applicationKey = (id) => `applications/${id}.json`;
export const reply = (ok, code, message, status = 200, extra = {}) => new Response(JSON.stringify({ ok, code, message, ...extra }), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});

// Authenticated Apps Script -> Sheets. Undelivered records remain in R2 for replay.
export async function deliverApplication(application, env) {
  if (!env.APPLICATION_SYNC_URL || !env.APPLICATION_SYNC_SECRET) return application;
  try {
    const url = new URL(env.APPLICATION_SYNC_URL);
    if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error("Invalid receiver URL");
    const response = await fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.APPLICATION_SYNC_SECRET, application }),
      signal: AbortSignal.timeout(15000), redirect: "follow",
    });
    const result = await response.json();
    if (!response.ok || !result.ok || result.applicationId !== application.applicationId) throw new Error("Receiver rejected application");
    application.delivery = { status: "delivered", at: new Date().toISOString() };
  } catch {
    application.delivery = { status: "pending", reason: "receiver-unavailable", attemptedAt: new Date().toISOString() };
    console.error(JSON.stringify({ event: "application-delivery-pending", applicationId: application.applicationId }));
  }
  try { await env.DECKS.put(applicationKey(application.applicationId), JSON.stringify(application), { httpMetadata: { contentType: "application/json" } }); }
  catch { console.error(JSON.stringify({ event: "application-delivery-status-failed", applicationId: application.applicationId })); }
  return application;
}
