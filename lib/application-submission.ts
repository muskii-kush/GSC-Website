export type SubmissionResult = {
  ok: boolean; code?: string; message?: string; entry?: string;
  applicationId?: string; reference?: string; submittedAt?: string; emailed?: boolean; recovered?: boolean;
};
type Hints = { email: string; cin: string };
type Fetcher = typeof fetch;

async function checkReceipt(hints: Hints, fetcher: Fetcher): Promise<SubmissionResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetcher("/api/application/status", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(hints),
      credentials: "same-origin", cache: "no-store", signal: controller.signal,
    });
    const out = await response.json().catch(() => null);
    if (response.ok && out?.ok && out.applicationId && out.reference && out.submittedAt) return out;
    if (response.status === 401 && out?.code === "signed-out") return out;
  } catch { /* A failed status check is never proof of receipt. */ }
  finally { clearTimeout(timer); }
  return null;
}

async function recover(hints: Hints, fetcher: Fetcher) {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await checkReceipt(hints, fetcher);
    if (result) return result;
  }
  return null;
}

const unconfirmed = (): SubmissionResult => ({
  ok: false, code: "receipt-unconfirmed",
  message: "We could not confirm receipt. Your answers are still saved. Check your connection and try again. If it continues, attach the PDF again before retrying.",
});

/** A lost HTTP response does not mean the server failed to save the application. */
export async function submitApplication(url: string, body: FormData, hints: Hints, onChecking: () => void, fetcher: Fetcher = fetch): Promise<SubmissionResult> {
  // Recover a previous attempt before uploading the same PDF again.
  const existing = await checkReceipt(hints, fetcher);
  if (existing) return existing;
  try {
    const response = await fetcher(url, { method: "POST", body, credentials: "same-origin" });
    const out: SubmissionResult | null = await response.json().catch(() => null);
    if (response.ok && out?.ok) return out;
    if (out?.code === "signed-out") return out;
    if (!out?.code || response.status >= 500 || ["duplicate", "already-submitted", "submission-in-progress"].includes(out.code)) {
      onChecking();
      const saved = await recover(hints, fetcher);
      if (saved) return saved;
    }
    if (out?.code) return { ...out, ok: false };
    if (response.status === 413) return { ok: false, code: "deck-too-large", message: "The upload was too large. Please attach a smaller PDF and try again." };
    return unconfirmed();
  } catch {
    onChecking();
    return await recover(hints, fetcher) || unconfirmed();
  }
}
