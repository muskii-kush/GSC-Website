// Cloudflare Pages Function: GET /api/deck/<id>/<file>.pdf
// Serves a submitted deck from R2. The <id> is a random UUID, so a link cannot be guessed;
// if DECK_LINK_SECRET is set, the link must also carry ?k=<secret> (it is added automatically
// to the link written into the Google Form).
export async function onRequestGet({ params, request, env }) {
  if (env.DECK_LINK_SECRET && new URL(request.url).searchParams.get("k") !== env.DECK_LINK_SECRET) {
    return new Response("Not found", { status: 404 });
  }
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path || "");
  if (!/^[0-9a-f-]{36}\/[A-Za-z0-9._-]+\.pdf$/i.test(key) || !env.DECKS) return new Response("Not found", { status: 404 });
  const obj = await env.DECKS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-robots-tag", "noindex");
  return new Response(obj.body, { headers });
}
