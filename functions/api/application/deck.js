// GET /api/application/deck: the signed-in founder's own submitted pitch deck.
import { applicationKey } from "../../_lib/applications";
import { sessionPhone, submittedFor } from "../../_lib/session";

export async function onRequestGet({ request, env }) {
  const phone = await sessionPhone(request, env);
  const done = phone && await submittedFor(phone, env);
  const record = done && await env.DECKS.get(applicationKey(done.applicationId));
  const key = record && (await record.json()).deck?.key;
  const obj = key && await env.DECKS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata?.(headers);
  headers.set("content-type", "application/pdf");
  headers.set("cache-control", "private, no-store");
  headers.set("x-robots-tag", "noindex");
  return new Response(obj.body, { headers });
}
