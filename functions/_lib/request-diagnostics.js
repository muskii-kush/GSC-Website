import { reply } from "./applications";

/** Correlate support screenshots with logs without recording answers, cookies or identity. */
export function applicationEndpoint(endpoint, handler) {
  return async (context) => {
    const requestId = crypto.randomUUID();
    const rawRay = context.request.headers.get("cf-ray");
    const ray = rawRay && /^[a-z0-9-]{1,80}$/i.test(rawRay) ? rawRay : undefined;
    const started = Date.now();
    let response;
    try { response = await handler(context, requestId); }
    catch (error) {
      console.error(JSON.stringify({ event: "application-request-failed", endpoint, requestId, ray, errorType: error instanceof Error ? error.name : "UnknownError" }));
      response = reply(false, "service-unavailable", "The application service is temporarily unavailable. Your answers are still saved. Please try again shortly.", 503);
    }
    response.headers.set("x-gsc-request-id", requestId);
    console.log(JSON.stringify({ event: "application-request-completed", endpoint, requestId, ray, status: response.status, durationMs: Date.now() - started }));
    return response;
  };
}
