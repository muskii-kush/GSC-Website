# Investigating application errors

These logs take effect after deploying the complete current Cloudflare release. The build command, production project, bindings, Sheet integration and 20 November deadline are unchanged.

## Find the candidate's request

Ask for the **Support reference** displayed with the error. No DevTools recording, OTP, mobile number or form answers are needed to identify the request. The reference is also returned in `x-gsc-request-id`. A Cloudflare rejection before the Function runs uses the `cf-ray` reference instead.

### Live Cloudflare logs

Open **Workers & Pages → the existing Pages project → the relevant deployment → View details → Functions** and start the live log stream before reproducing the issue. Find the request's `requestId` and read its stage and final result. See [Cloudflare Pages logging](https://developers.cloudflare.com/pages/functions/debugging-and-logging/).

The standard Pages stream does not retain historical logs. Cloudflare Security Events are the right place to investigate a Ray ID for a request blocked before reaching the Function. Runtime termination, platform limits and requests that never reach the Function must be checked in Cloudflare's platform metrics/logs; application code cannot archive an event it never gets to handle.

### Saved private diagnostics

In the existing private R2 bucket bound as `DECKS`, open:

```text
diagnostics/YYYY-MM-DD/<support-reference>/request.json
diagnostics/YYYY-MM-DD/<support-reference>/background.json
```

The date prefix and log timestamps use **UTC**. A request file is saved for an authenticated error or an exception after authorization. A background file is saved when an accepted application's indexing, optional Sheet push, mailer or status write fails. It records `status: 200`, `recorded: true` and `code: accepted-background-failed` so a delivery failure is not mistaken for a lost application.

Each file contains at most the latest **64 sanitized events**, the total event count and a truncation flag. Successful requests without errors and ordinary `not-found` receipt checks do not create records. Unauthenticated requests and failed OTP verification remain live-log events, preventing anonymous requests from creating diagnostic objects. Diagnostic write failures never change the application's result. These files remain in R2 until the owner removes them; no automatic deletion policy is added.

The diagnostic prefix is excluded from the application CSV/admin listing and cannot be served by the deck download route. Access requires the existing Cloudflare/R2 account permissions; there is no new public log endpoint.

## Read a log entry

```json
{
  "schemaVersion": 1,
  "timestamp": "2026-11-11T10:00:00.000Z",
  "level": "error",
  "event": "application-stage-failed",
  "endpoint": "apply",
  "requestId": "11111111-1111-4111-8111-111111111111",
  "stage": "archive-application",
  "durationMs": 145,
  "errorType": "Error",
  "errorReason": "storage"
}
```

`application-request-completed` includes the HTTP `status`, application result `code`, failed question `field` when applicable, and total duration. Its level is `warn` for rejected requests and `error` for server failures. An ordinary missing receipt is informational. `application-stage-started`, `application-stage-completed` and `application-stage-failed` show where processing stopped and how long that operation took.

## Common cases

| Stage/event | Meaning and next check |
| --- | --- |
| `verify-session`, `signed-out` | Session missing/expired; verify the same mobile number again. |
| `parse-multipart`, `validate-payload` | Request body could not be read or was invalid. |
| `validate-answers`, `invalid-answer` | Check the logged question `field`; values are deliberately omitted. |
| `read-receipt-index`, `read-receipt-archive` | Receipt lookup failed; inspect R2 availability and the existing indexes. |
| `application-conflict` | `kind` identifies phone/email/CIN; `source` distinguishes an accepted application, live reservation or legacy marker. Inspect the accepted records before changing any marker. |
| `reserve-identity` | An R2 reservation write failed. `resource-limit`, `access-denied`, `network` or `storage` narrows the investigation. |
| `upload-deck` | PDF storage failed. `deckBytes` records the size without the name or content. |
| `archive-application` | Saving the accepted application failed; inspect the following reconciliation event and `recorded` flag. |
| `reconcile-archive`, `preserve: true` | Storage acknowledgement is uncertain; the existing deck and claims were preserved. |
| `cleanup-reservations`, `cleanup-deck` | Cleanup failed after a rejected/unrecorded attempt. |
| `application-receipt-pending` | A verified phone has a live reservation; wait/check status rather than uploading again. |
| `verify-otp-provider`, `otp-verification-rejected` | Server-side OTP verification failed; inspect `upstreamStatus` and the safe error category. The identifier and OTP are omitted. |
| `application-delivery-pending` | Optional Apps Script Sheet push failed. `upstreamStatus` distinguishes HTTP failures from a timeout or invalid JSON. The application remains recorded in R2. |
| `confirmation-email-failed` | The application was recorded; the confirmation email failed. Check `upstreamStatus`/`errorReason`. |
| `application-export-read-failed` | The CSV stream failed after headers were sent; inspect `rowCount` and the saved diagnostic, not just the HTTP 200 header. |
| No matching Function log, Cloudflare Ray ID shown | Inspect Cloudflare Security Events or platform errors. |

Error categories describe broad classes inferred from the exception type/message; they are diagnostic hints, not a substitute for provider/platform metrics. Custom logs never include raw error messages/stacks, URLs/query strings, request/response bodies, answers, email, phone, company, CIN, OTP, cookies, authorization headers or secret values. Application IDs, support references, stage names, question IDs, counts, sizes, result codes and timing are recorded.

## Verification

`npm run test:application` verifies stage ordering, severity, correlation, bounded retention, error categorization, redaction, background failures, diagnostic-write isolation, streaming export errors, and private diagnostic access. Run `npm run build:cloudflare` and deploy the complete generated `out/` directory as usual.
