// Deliberately allowlist log fields. Never serialize requests, payloads or raw errors.
const label = (value) => typeof value === "string" && /^[a-z][a-z0-9_-]{0,79}$/i.test(value) ? value : undefined;
const uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
const labels = new Set(["endpoint", "stage", "code", "kind", "source", "reason", "service", "outcome"]);
const numbers = new Set(["status", "upstreamStatus", "durationMs", "requestBytes", "deckBytes", "fieldCount", "answerCount", "claimCount", "rowCount"]);
const flags = new Set(["recorded", "preserve", "configured", "recovered", "submitted", "background"]);

function details(fields) {
  const safe = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (labels.has(key) && label(value)) safe[key] = value;
    else if (numbers.has(key) && Number.isFinite(value) && value >= 0) safe[key] = value;
    else if (flags.has(key) && typeof value === "boolean") safe[key] = value;
    else if (key === "applicationId" && uuid(value)) safe[key] = value;
    else if (key === "field" && typeof value === "string" && /^(entry\.\d+|emailAddress|deck)$/.test(value)) safe[key] = value;
  }
  return safe;
}

/** Categorize errors without logging messages that can contain PII, URLs or credentials. */
export function errorDetails(error) {
  const knownTypes = ["Error", "TypeError", "RangeError", "SyntaxError", "AbortError", "TimeoutError", "DataCloneError", "NotReadableError"];
  const errorType = knownTypes.includes(error?.name) ? error.name : "UnknownError";
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  let errorReason = "unexpected-error";
  if (["AbortError", "TimeoutError"].includes(errorType) || /timed?\s*out|timeout|deadline/.test(message)) errorReason = "timeout";
  else if (errorType === "SyntaxError") errorReason = "invalid-json";
  else if (/permission|denied|unauthor|forbidden/.test(message)) errorReason = "access-denied";
  else if (/quota|limit|too many/.test(message)) errorReason = "resource-limit";
  else if (/network|fetch failed|connection|socket|dns/.test(message)) errorReason = "network";
  else if (/reservation|etag|conflict|claim.*changed/.test(message)) errorReason = "conflict";
  else if (/configuration|invalid.*url/.test(message)) errorReason = "configuration";
  else if (/bucket|r2|storage|object/.test(message)) errorReason = "storage";
  return { errorType, errorReason };
}

export function createLogger(context = {}, history = { events: [], eventCount: 0, hadErrors: false, archiveAllowed: false }) {
  const base = details(context);
  if (uuid(context.requestId)) base.requestId = context.requestId;
  if (typeof context.ray === "string" && /^[a-z0-9-]{1,80}$/i.test(context.ray)) base.ray = context.ray;
  let currentStage = "request";
  const emit = (level, event, fields, error) => {
    const entry = { schemaVersion: 1, timestamp: new Date().toISOString(), level, event: label(event) || "application-event", ...base, stage: currentStage, ...details(fields), ...(error ? errorDetails(error) : {}) };
    history.events.push(entry);
    history.eventCount++;
    if (history.events.length > 64) history.events.shift();
    if (level === "error") history.hadErrors = true;
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](JSON.stringify(entry));
  };
  return {
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields, error) => emit("warn", event, fields, error),
    error: (event, error, fields) => emit("error", event, fields, error),
    mark(stage, fields) { currentStage = label(stage) || "request"; emit("info", "application-stage-started", fields); },
    async step(stage, operation, fields) {
      currentStage = label(stage) || "request";
      const started = Date.now();
      emit("info", "application-stage-started", { ...fields, stage });
      try {
        const result = await operation();
        emit("info", "application-stage-completed", { ...fields, stage, durationMs: Date.now() - started });
        return result;
      } catch (error) {
        emit("error", "application-stage-failed", { ...fields, stage, durationMs: Date.now() - started }, error);
        throw error;
      }
    },
    // Only handlers that have verified a session or admin secret enable R2 diagnostics.
    allowArchive() { history.archiveAllowed = true; },
    snapshot: () => ({ context: { ...base }, events: history.events.map((entry) => ({ ...entry })), eventCount: history.eventCount, hadErrors: history.hadErrors, archiveAllowed: history.archiveAllowed }),
    with: (fields) => createLogger({ ...base, ...details(fields) }, history),
  };
}

/** Private failure records survive the live logging session. They never affect acceptance. */
export async function saveDiagnostics(log, env, fields) {
  const snapshot = log.snapshot();
  if (!snapshot.archiveAllowed || !env?.DECKS || !snapshot.context.requestId) return;
  const timestamp = new Date().toISOString();
  const phase = fields?.background ? "background" : "request";
  const key = `diagnostics/${timestamp.slice(0, 10)}/${snapshot.context.requestId}/${phase}.json`;
  try {
    await env.DECKS.put(key, JSON.stringify({ schemaVersion: 1, timestamp, ...snapshot.context, ...details(fields), eventCount: snapshot.eventCount, truncated: snapshot.eventCount > snapshot.events.length, events: snapshot.events }), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { requestId: snapshot.context.requestId, endpoint: snapshot.context.endpoint || "unknown" },
    });
  } catch (error) { log.error("application-diagnostic-save-failed", error); }
}
