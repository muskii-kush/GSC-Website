import { reply } from "./applications";
import { createLogger, saveDiagnostics } from "./logger";

/** Correlate support screenshots with logs without recording answers, cookies or identity. */
export function applicationEndpoint(endpoint, handler) {
  return async (context) => {
    const requestId = crypto.randomUUID();
    const log = createLogger({ endpoint, requestId, ray: context.request.headers.get("cf-ray") });
    const started = Date.now();
    const declaredLength = context.request.headers.get("content-length");
    log.info("application-request-started", { requestBytes: declaredLength === null ? undefined : Number(declaredLength) });
    let response;
    try { response = await handler(context, requestId, log); }
    catch (error) {
      log.error("application-request-failed", error);
      response = reply(false, "service-unavailable", "The application service is temporarily unavailable. Your answers are still saved. Please try again shortly.", 503);
    }
    response.headers.set("x-gsc-request-id", requestId);
    const code = response.headers.get("x-gsc-result-code");
    const level = response.status >= 500 ? "error" : response.status >= 400 && code !== "not-found" ? "warn" : "info";
    const fields = { status: response.status, code, field: response.headers.get("x-gsc-error-field"), durationMs: Date.now() - started };
    if (level === "error") log.error("application-request-completed", undefined, fields);
    else log[level]("application-request-completed", fields);
    if ((response.status >= 400 && code !== "not-found") || log.snapshot().hadErrors) {
      const persist = saveDiagnostics(log, context.env, { status: response.status, code });
      if (context.waitUntil) context.waitUntil(persist); else await persist;
    }
    return response;
  };
}
