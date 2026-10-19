# GSC Cloudflare deployment and Google Sheet restoration

## 19 October: submission retry repair

Deploy the latest `GSC-Website-submission-fix.zip` to the existing project using the steps below. Deploy the complete `out/` folder so the browser code and Worker update together. Keep all existing storage bindings and secrets, including `SESSION_SECRET` and the Sheet configuration.

- The browser checks `POST /api/application/status` before uploading and after a lost response. A receipt is shown only when the server confirms a saved application for the OTP-verified number.
- Applications saved before the phone index was introduced can be recovered through their email/CIN indexes after the number recorded on the application matches the verified number. The phone index is then restored, allowing the read-only copy to open.
- Expired R2 reservations without an accepted archive can be reclaimed, including older timestamp-only reservations. Accepted archives remain protected.
- If an archive write commits but its acknowledgement is lost, cleanup preserves the accepted application's deck and indexes.
- Genuine duplicate errors identify the blocked email or CIN/LLPIN field. Production logs record `application-conflict` with `kind` and `source` (`application`, `reservation` or `legacy-index`), without logging applicant details.

An older KV duplicate marker with no R2 index is kept because it may represent a valid submission from before R2 archives were introduced. If logs report `legacy-index`, the production owner must inspect that marker against the original records; do not bulk-delete duplicate indexes. An email missing from the CSV does not prove that its company has never applied under a different email.

Verification: submit a marked test application, simulate loss of the success response, and confirm receipt recovery, one archived application, the private read-only copy, its PDF and the Sheet export. Run `npm run test:application` for automated regression checks. `npm run build:cloudflare` rejects a release missing the status, sign-in, application or CSV routes.

## Existing production integration

Applications go to **[GSC 2027 Applications — Sheet1](https://docs.google.com/spreadsheets/d/1YkL9tQyJrpG4sUsNDl7XVIQag9VvEGCowMY0MMnhT5c/edit#gid=0)**.

Sheet1 cell A1 uses `IMPORTDATA` to load CSV from:

```text
https://gsc.cars24.com/api/admin/export?key=<existing SHEET_KEY>
```

`SHEET_KEY` is the access key for that CSV feed. Preserve its existing value in the production Cloudflare project. Keep the key private. The restored endpoint reads all saved `applications/*.json` records from R2, including applications saved before this repair. No resubmission or replay is needed.

The previous deployment package omitted `/api/admin/export`, so the Sheet's existing formula received HTTP 404. This release includes the restored route in the compiled Worker. No Google service account, new Sheet, or Apps Script deployment is required for this integration.

## Deploy this repair

Use the Cloudflare account and **existing Pages project serving gsc.cars24.com**. The locally signed-in Cloudflare account has no access to that production project.

1. Extract the latest `GSC-Website-sheet-fix.zip` (or `GSC-Website-deploy-ready.zip`). Open the extracted `GSC-Website-deploy-ready` folder.
2. In the production project's Settings > Variables and Secrets / Bindings, preserve:

   | Name | Existing setting |
   | --- | --- |
   | `DECKS` | R2 binding to `gsc-2027-decks` |
   | `SHEET_KEY` | Existing key used by Sheet1 A1 |
   | `APPLICANTS` | Existing KV binding, if configured |
   | `DECK_LINK_SECRET` | Existing deck access secret, if configured |
   | `SESSION_SECRET` | **New.** A long random value (for example `openssl rand -hex 32`), set as an encrypted secret. Signs the mobile-number sign-in. If it is missing, sign-in falls back to `DECK_LINK_SECRET` or `SHEET_KEY`. |
   | `MAIL_URL` | **New, for confirmation emails.** The `/exec` URL of the mailer web app (see "Confirmation email" below). |
   | `MAIL_SECRET` | **New, for confirmation emails.** Same value as `GSC_MAIL_SECRET` in the mailer's Script Properties. Without these two, applications still work but no email is sent. |

3. Redeploy from the extracted folder, replacing the project name and using the project's production branch:

   ```bash
   npx wrangler login
   npx wrangler pages project list
   npx wrangler pages deploy out --project-name YOUR_EXISTING_PROJECT --branch main
   ```

   For a Direct Upload project with dashboard deployments, choose **Create a new deployment > Production** and upload the contents of `out/`, including `_worker.js` and `_routes.json`. Do not upload the outer handoff folder as the website root. See [Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

4. Confirm the feed URL from Sheet1 A1 returns CSV with HTTP 200 and includes the application ID from the R2 screenshot. A request without the key should return HTTP 401.
5. Refresh the import in the original Sheet1 A1 by adding `&v=20261009` to the URL inside its existing formula, preserving the key. This changes the source URL and triggers a new import. Do not replace the formula with static rows. Google import functions otherwise check for updates hourly while the spreadsheet is open; reopening the document does not trigger a refresh. See [Google import function refresh behavior](https://support.google.com/docs/answer/12188454?hl=en).
6. Confirm the application appears in **Sheet1** and its pitch deck URL opens. Use a clearly marked test application to verify the full website submission flow before launch.

The unused **Website applications** tab and undeployed Apps Script receiver created during troubleshooting are not the destination used by this integration.

## Application storage and export

- `/api/apply` validates answers using the browser's shared question rules and stores both the PDF and complete labelled application JSON in R2 before returning success.
- Saved records are `applications/<applicationId>.json`; deck links use `/api/deck/...`.
- `/api/admin/export` requires the existing `SHEET_KEY` and exports all saved records as CSV with application ID, submission date, email, company, CIN/LLPIN, deck URL and one column per question. Historical answers outside the current schema are preserved in an additional JSON column.
- The feed paginates R2 and orders records by submission date. CSV quoting preserves commas, quotes, newlines and checkbox answers. Formula-like applicant input is escaped as literal text.
- Founders sign in with a mobile OTP before the form opens. `/api/auth/verify` checks the code with the Cars24 OTP service on the server and sets a signed, HttpOnly cookie (12 hours). `/api/apply` refuses any submission without it and always records the verified number, not one typed into the form.
- After sign-in, `/api/auth/verify` reports whether that number has already applied, so the site shows the "already applied" screen on any device. `/api/auth/logout` signs out ("Not you? Use a different number").
- R2 identity records prevent duplicate mobile number, email and company applications. Retrying the same browser submission returns its original receipt.
- Public Google Forms server submissions were failing with a reCAPTCHA rejection. Application storage now works independently of that endpoint.

## Confirmation email

After an application is recorded, the founder is emailed their application ID (for example `GSC27-2A7C9B18`) and a full copy of their answers. The email is sent by a small Apps Script web app, so it comes from the Google account that owns it.

1. Signed in as the account that should send the email (ideally grandstartupchallenge@cars24.com), create a new Apps Script project and paste `docs/apps-script/gsc_mailer.gs`.
2. Project Settings > Script Properties: add `GSC_MAIL_SECRET` with a long random value.
3. Run `checkMailSetup` once from the editor and approve the email permission.
4. Deploy > New deployment > Web app: Execute as **Me**, access **Anyone**. Copy the `/exec` URL.
5. In Cloudflare, add `MAIL_URL` (the `/exec` URL) and `MAIL_SECRET` (the same random value) as secrets, then redeploy.
6. Submit a clearly marked test application and confirm the email arrives. Each record stores `confirmation.status` (`sent` or `not-sent`), so missed emails can be found later.

Google Workspace accounts can send to about 1,500 recipients a day through Apps Script.

## Founder's own copy

- `GET /api/application` returns the signed-in founder's own submitted answers (read-only); `GET /api/application/deck` returns their own deck. Both require the mobile-number sign-in and only ever return the application recorded for that number.

## Building future releases

```bash
npm ci
npm run test:application
npm run build:cloudflare
```

Node 20 or newer is required. The build uses an isolated static export and packages a compiled Worker, all API routes and their shared modules. It checks that `/api/admin/export` is present before producing a release.

Artifacts under `IT-handoff/`:

- `GSC-Website-sheet-fix.zip`: this complete repair package.
- `GSC-Website-deploy-ready.zip`: the same deployable content under the standard release name.
- `GSC-Website-source.zip`: source for future builds.

## Diagnostics and optional administration

Production logs use event names without applicant data or access keys:

- `application-recorded`: the complete application and deck are saved.
- `application-storage-failed`: no receipt was issued; investigate storage/bindings.
- `application-export-list-failed` or `application-export-read-failed`: investigate R2 access before refreshing the Sheet.

The optional bearer-authenticated `/api/admin/applications` route and `scripts/applications.mjs` allow private JSON retrieval with `APPLICATION_ADMIN_SECRET`. Optional Apps Script push delivery remains available for other deployments that explicitly configure `APPLICATION_SYNC_URL` and `APPLICATION_SYNC_SECRET`; it is not needed for the existing Sheet1 CSV import.

## Source files

| File | Purpose |
| --- | --- |
| `functions/api/apply.js` | Durable application and PDF storage |
| `functions/api/admin/export.js` | Existing SHEET_KEY-protected CSV feed |
| `functions/api/deck/[[path]].js` | Stored deck retrieval |
| `lib/application-questions.ts` | Shared questions and order |
| `lib/application-validation.ts` | Shared validation |
| `components/Registration.tsx` | Application UI and retry identity |
| `scripts/build-cloudflare-release.mjs` | Verified deployment package |
