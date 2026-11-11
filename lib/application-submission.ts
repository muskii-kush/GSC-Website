export type SubmissionResult = {
  ok: boolean; code?: string; message?: string; entry?: string;
  applicationId?: string; reference?: string; submittedAt?: string; emailed?: boolean; recovered?: boolean;
  httpStatus?: number; requestId?: string;
};
type Hints = { email: string; cin: string };
type Fetcher = typeof fetch;
type RetryOptions = { retryDelays?: readonly number[] };
type ReceiptCheck = { state: "received" | "absent" | "pending" | "unavailable"; result: SubmissionResult };
const RETRY_DELAYS = [0, 1000, 2000, 4000, 8000];
const CONTACT = "grandstartupchallenge@cars24.com";

function diagnostic(response: Response) {
  const raw = response.headers.get("x-gsc-request-id") || response.headers.get("cf-ray");
  const requestId = raw && /^[a-z0-9-]{1,80}$/i.test(raw) ? raw : undefined;
  return { httpStatus: response.status, ...(requestId ? { requestId } : {}) };
}

function httpFailure(response: Response, checking: boolean): SubmissionResult {
  const details = diagnostic(response);
  const saved = "Your answers are still saved on this device.";
  let code = "server-unavailable", message = `The application service is temporarily unavailable. Please try again shortly. ${saved}`;
  if (response.status === 401) {
    code = "signed-out"; message = `Your sign-in has expired. Verify the same mobile number again. ${saved}`;
  } else if (response.status === 403) {
    code = "request-blocked"; message = `The site's security service blocked this request. Please contact ${CONTACT} about this error. ${saved}`;
  } else if (response.status === 413) {
    code = "deck-too-large"; message = `The upload was rejected as too large. Please attach a smaller PDF and try again. ${saved}`;
  } else if (response.status === 429) {
    code = "rate-limited"; message = `Too many requests reached the application service. Please wait a minute before trying again. ${saved}`;
  } else if (response.status === 404 || response.status === 405) {
    code = "service-unavailable"; message = `The ${checking ? "submission status" : "application"} service is unavailable. Please contact ${CONTACT}. ${saved}`;
  } else if (response.ok) {
    code = "invalid-response"; message = `The application service returned an unreadable confirmation. Please check submission status before uploading again. ${saved}`;
  }
  return { ok: false, code, message, ...details };
}

function withReference(result: SubmissionResult): SubmissionResult {
  return result.requestId ? { ...result, message: `${result.message} Support reference: ${result.requestId}.` } : result;
}

async function readResult(response: Response): Promise<SubmissionResult | null> {
  const out = await response.json().catch(() => null);
  return out && typeof out === "object" && typeof out.ok === "boolean" ? out : null;
}

async function checkReceipt(hints: Hints, fetcher: Fetcher): Promise<ReceiptCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher("/api/application/status", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(hints),
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    });
    const out = await readResult(response);
    if (response.ok && out?.ok && out.applicationId && out.reference && out.submittedAt) return { state: "received", result: out };
    // Only the API's explicit not-found result proves there is no saved receipt yet.
    if (response.status === 404 && out?.code === "not-found") return { state: "absent", result: out };
    if (out?.code === "submission-in-progress") return { state: "pending", result: { ...out, ...diagnostic(response) } };
    return { state: "unavailable", result: withReference({ ...httpFailure(response, true), ...(!out?.ok && out?.code ? out : {}), ok: false }) };
  } catch {
    return { state: "unavailable", result: {
      ok: false, code: "status-unavailable",
      message: "We could not reach the submission status service. Your answers are still saved. Please try checking status again shortly.",
    } };
  } finally { clearTimeout(timer); }
}

async function recover(hints: Hints, fetcher: Fetcher, options: RetryOptions): Promise<ReceiptCheck> {
  let latest: ReceiptCheck | undefined;
  for (const delay of options.retryDelays?.length ? options.retryDelays : RETRY_DELAYS) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    latest = await checkReceipt(hints, fetcher);
    if (latest.state === "received" || latest.result.code === "signed-out") return latest;
    if (["request-blocked", "rate-limited", "service-unavailable"].includes(latest.result.code || "")) return latest;
  }
  return latest!;
}

function unresolved(check: ReceiptCheck): SubmissionResult {
  if (check.state === "received") return check.result;
  if (check.state === "pending") return withReference({ ...check.result, ok: false,
    message: "Your earlier submission is still being processed. Please check submission status again shortly; you do not need to upload the PDF again yet." });
  if (check.state === "unavailable") return check.result;
  return { ok: false, code: "receipt-unconfirmed",
    message: "We have not found a saved receipt yet. Your answers are still saved. Check submission status again shortly. If no receipt is found, reattach the PDF and try submitting again." };
}

/** Read-only recovery works without the original PDF and after applications close. */
export async function checkSubmissionStatus(hints: Hints, fetcher: Fetcher = fetch, options: RetryOptions = {}): Promise<SubmissionResult> {
  const first = await checkReceipt(hints, fetcher);
  if (first.state === "received") return first.result;
  if (first.state === "pending") return unresolved(await recover(hints, fetcher, options));
  return unresolved(first);
}

/** A lost HTTP response does not mean the server failed to save the application. */
export async function submitApplication(url: string, body: FormData | (() => Promise<FormData>), hints: Hints, onChecking: () => void, fetcher: Fetcher = fetch, options: RetryOptions = {}): Promise<SubmissionResult> {
  // Recover a previous attempt before uploading the same PDF again.
  const existing = await checkReceipt(hints, fetcher);
  if (existing.state === "received") return existing.result;
  if (existing.state === "unavailable") return existing.result;
  if (existing.state === "pending") {
    onChecking();
    const pending = await recover(hints, fetcher, options);
    if (pending.state !== "absent") return pending.state === "received" ? pending.result : unresolved(pending);
  }
  // Build/read the file only after recovering any earlier receipt.
  let form: FormData;
  try { form = typeof body === "function" ? await body() : body; }
  catch { return { ok: false, code: "deck-unreadable", entry: "deck", message: "The selected PDF can no longer be read. Your answers are still saved. Please attach the PDF again and submit." }; }
  try {
    const response = await fetcher(url, { method: "POST", body: form, credentials: "same-origin" });
    const out = await readResult(response);
    if (response.ok && out?.ok && out.applicationId && out.reference) return out;
    if (out?.code === "signed-out") return out;
    const failure = withReference({ ...httpFailure(response, false), ...(!out?.ok && out?.code ? out : {}), ok: false });
    // Definitive HTTP rejections need the actual remedy, not a connection-error message.
    if (response.status >= 400 && response.status < 500 && response.status !== 409) return failure;
    if (out?.ok || !out?.code || response.status >= 500 || ["duplicate", "already-submitted", "submission-in-progress"].includes(out.code)) {
      onChecking();
      const saved = await recover(hints, fetcher, options);
      if (saved.state === "received" || saved.result.code === "signed-out") return saved.result;
      if (saved.state === "pending") return unresolved(saved);
    }
    return failure;
  } catch {
    onChecking();
    const saved = await recover(hints, fetcher, options);
    return saved.state === "received" ? saved.result : unresolved(saved);
  }
}
