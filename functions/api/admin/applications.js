import { applicationKey, deliverApplication, reply } from "../../_lib/applications";

async function authorised(request, env) {
  if (!env.APPLICATION_ADMIN_SECRET) return false;
  const digest = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const a = await digest(request.headers.get("authorization") || ""), b = await digest(`Bearer ${env.APPLICATION_ADMIN_SECRET}`);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
const validId = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function onRequestGet({ request, env }) {
  if (!await authorised(request, env)) return reply(false, "unauthorised", "Not authorised.", 401);
  if (!env.DECKS) return reply(false, "not-configured", "Storage is not configured.", 503);
  const url = new URL(request.url), id = url.searchParams.get("id");
  if (id) {
    if (!validId(id)) return reply(false, "bad-request", "Invalid application ID.", 400);
    const object = await env.DECKS.get(applicationKey(id));
    if (!object) return reply(false, "not-found", "Application not found.", 404);
    return reply(true, "ok", "Application loaded.", 200, { application: await object.json() });
  }
  const result = await env.DECKS.list({ prefix: "applications/", limit: 100, cursor: url.searchParams.get("cursor") || undefined });
  return reply(true, "ok", "Applications listed.", 200, { applications: result.objects.map((o) => ({ applicationId: o.key.slice(13, -5), uploadedAt: o.uploaded })), cursor: result.truncated ? result.cursor : null });
}

export async function onRequestPost({ request, env }) {
  if (!await authorised(request, env)) return reply(false, "unauthorised", "Not authorised.", 401);
  if (!env.DECKS || !env.APPLICATION_SYNC_URL || !env.APPLICATION_SYNC_SECRET) return reply(false, "not-configured", "Configure the authenticated Sheet receiver first.", 503);
  let body;
  try { body = await request.json(); } catch { return reply(false, "bad-request", "Invalid JSON.", 400); }
  if (!validId(body?.applicationId)) return reply(false, "bad-request", "Invalid application ID.", 400);
  const object = await env.DECKS.get(applicationKey(body.applicationId));
  if (!object) return reply(false, "not-found", "Application not found.", 404);
  let application = await object.json();
  if (application.delivery.status !== "delivered") application = await deliverApplication(application, env);
  return reply(application.delivery.status === "delivered", application.delivery.status, application.delivery.status === "delivered" ? "Application delivered." : "Application remains saved; delivery is pending.", application.delivery.status === "delivered" ? 200 : 502);
}
