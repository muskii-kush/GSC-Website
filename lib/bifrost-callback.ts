/** Normalize a code returned by Bifrost's redirect into the headless client's JSON response. */
export function bifrostCallbackResponse(request: Request, redirectUri: string | undefined, authApiBaseUrl: string | undefined): Response | null {
  if (!redirectUri || !authApiBaseUrl) return null;
  const url = new URL(request.url);
  let redirect: URL;
  let auth: URL;
  try {
    redirect = new URL(redirectUri);
    auth = new URL(authApiBaseUrl);
  } catch {
    return null;
  }
  if (url.origin !== redirect.origin || url.pathname !== redirect.pathname) return null;
  const code = url.searchParams.get("code");
  if (!code || (request.method !== "GET" && request.method !== "OPTIONS")) return null;

  // A cross-origin fetch redirected back to the site carries Origin: null.
  // This response only echoes the code in this request; it reads no cookies or saved tokens.
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-mode") === "navigate") return null;
  if (origin && origin !== "null" && origin !== auth.origin && origin !== redirect.origin) return null;
  if (!origin && request.headers.get("sec-fetch-mode") !== "cors") return null;

  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    Vary: "Origin, Sec-Fetch-Mode",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type, x-device-id, x-client-id");
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  return new Response(JSON.stringify({ success: true, data: { code, state: url.searchParams.get("state") } }), { headers });
}
