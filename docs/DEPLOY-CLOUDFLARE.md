# Grand Startup Challenge site: deploying on Cloudflare Pages

This is everything needed to put the site live on Cloudflare, including the application form.

## How applications work

1. A founder fills in the application on the website (`components/Registration.tsx`) and attaches their pitch deck (PDF, up to 50MB).
2. The site sends the answers and the deck to `/api/apply`, a Cloudflare Pages Function in this repo (`functions/api/apply.js`).
3. The function validates the answers using the same rules as the browser, then stores the PDF and complete labelled application JSON in the existing private R2 bucket. Success is returned only after both are saved.
4. Each JSON record is under `applications/<applicationId>.json`. Deck links open through `/api/deck/...`. These JSON records cannot be accessed through the deck route.
5. Conditional R2 identity records block a second application with the same email or CIN/LLPIN, including concurrent requests. The existing KV duplicate records remain supported. Retrying the same browser submission after a lost response returns the original receipt.
6. Optional authenticated Apps Script delivery writes to a **Website applications** tab in the review spreadsheet. This is separate from the original Google Form's Responses tab. Delivery failures leave the complete application saved in R2 for replay.

No Google sign-in is needed by applicants. On 9 October 2026, the public Google Forms endpoint returned HTTP 400 with `data-captcha-challenge-failed="true"` for server submissions. Adding its hidden fields did not resolve it. The website therefore records applications independently of that endpoint.

## Deploying from the zip files (no Git access)

Two zips are provided:

- **GSC-Website-deploy-ready.zip**: the built site (`out/`) and server functions (`functions/`). Use this to deploy as is.
- **GSC-Website-source.zip**: the full source, if you want to build it yourself.

Redeploy to the **existing Pages project serving gsc.cars24.com** with Wrangler. Replace `YOUR_PROJECT_NAME` with that project's name, and use its configured production branch (shown as `main` below):

```
unzip GSC-Website-deploy-ready.zip && cd GSC-Website-deploy-ready
npx wrangler login
npx wrangler pages project list
npx wrangler pages deploy out --project-name YOUR_PROJECT_NAME --branch main
```

Run the deploy command from the supplied deploy-ready folder. The package includes a compiled `out/_worker.js`, static assets, function sources and their shared `lib/` modules. The existing `DECKS` binding is sufficient to accept applications immediately. Keep the existing bindings and secrets when redeploying.

For a Direct Upload project that offers **Create a new deployment** in the dashboard, select **Production** and upload the **contents of `out/`**, including `_worker.js` and `_routes.json`. The compiled `_worker.js` is supported by dashboard uploads. The full handoff ZIP has an outer folder and source files, so extract it first and upload only `out/`. Existing Git-integrated projects should use the Wrangler command above. Cloudflare documents these options at https://developers.cloudflare.com/pages/get-started/direct-upload/.

To build from source instead: `npm ci`, then `npm run build:cloudflare` (Node 20 or newer). This builds in a temporary directory and creates both zips under `IT-handoff/` without deleting source API routes.

For later updates we will send a new deploy-ready zip; redeploy it the same way.

## 1. Create the Pages project (if connecting to Git)

Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git, then pick this repository and the `main` branch.

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `rm -rf app/api && npm run build` |
| Build output directory | `out` |
| Root directory | (leave blank) |

Environment variables (Settings > Variables and Secrets, for Production and Preview):

| Name | Value |
|---|---|
| `NODE_VERSION` | `20` |
| `STATIC_EXPORT` | `true` |
| `NEXT_PUBLIC_STATIC_SITE` | `true` |
| `DECK_LINK_SECRET` | a long random string, stored as a **secret** (e.g. output of `openssl rand -hex 24`) |

Do **not** set `NEXT_PUBLIC_BASE_PATH`: the site is served from the root of its domain.

The `functions/` folder is picked up automatically; nothing else is needed for the API routes.

Phone verification calls the production BFF at `https://api.cars24.com/gw/plt/bffsvc`, using `/api/v1/otp/generate` and `/api/v1/otp/verify` directly from `lib/otp-auth.ts`. No auth client ID, redirect URI, or callback middleware is required.

## 2. Storage bindings

Settings > Bindings (or Functions > Bindings):

| Type | Variable name | Resource to create |
|---|---|---|
| R2 bucket | `DECKS` | a new private bucket, e.g. `gsc-2027-decks` (leave public access **off**) |
| KV namespace | `APPLICANTS` | a new namespace, e.g. `gsc-2027-applicants` |

R2 needs to be enabled on the Cloudflare account once (it asks for a billing method even on the free tier). Expected use is well inside the free allowance: roughly 1,000 decks at a few MB each.

Redeploy after adding bindings so the functions pick them up.

## 3. Domain

Settings > Custom domains > add the final domain. After it is live, update the rubric link in the Google Form description to `https://<domain>/#scoring`.

## 4. Test before announcing

1. Open `https://<domain>/#register`, complete mobile OTP sign-in, fill the form with clearly marked test data, attach a small PDF and submit. The page should say "application received".
2. In R2, confirm `applications/<applicationId>.json` contains all answers and its deck link opens the PDF. If Sheet delivery is configured, confirm the **Website applications** tab contains the matching application ID.
3. Delete the test application JSON, deck, its two `applicants/` identity objects and the two KV keys (`email:...`, `cin:...`) so the test email and CIN can be reused. Identity object names are SHA-256 hashes of the normalised email and CIN/LLPIN.

If the page shows an error, check Pages project > Functions > Real-time logs. `application-storage-failed` means no receipt was issued; answers remain in the browser. `application-recorded` confirms the durable record exists. `application-delivery-pending` means the application is recorded and awaits Sheet replay.

## 5. Optional Google Sheet delivery and private exports

Applications can be accepted before this integration is configured. Staff can inspect the labelled JSON records in the private R2 dashboard in the meantime.

1. Open the review spreadsheet, choose **Extensions > Apps Script**, and paste `docs/apps-script/gsc_sheet_receiver.gs`.
2. In Apps Script **Project settings > Script properties**, set `GSC_SPREADSHEET_ID` to the spreadsheet ID from its URL and `GSC_SYNC_SECRET` to a new long random secret.
3. Run `checkSheetSetup` and authorise access to the spreadsheet. Deploy a Web app: **Execute as Me**, **Who has access: Anyone**. The receiver rejects requests without the shared secret. If Workspace policy prevents public web apps, keep R2 storage as the source of truth and use private exports.
4. Set Pages secrets `APPLICATION_SYNC_URL` to the deployment's `/exec` URL and `APPLICATION_SYNC_SECRET` to the same secret. Redeploy. New applications will copy into **Website applications**; retries are idempotent by application ID.
5. Set a separate random Pages secret `APPLICATION_ADMIN_SECRET` and redeploy to enable private list, export and replay. Requests require `Authorization: Bearer <secret>`.

With that admin secret available as a local environment variable:

```bash
node scripts/applications.mjs export applications.json
node scripts/applications.mjs sync
```

Set `GSC_SITE_URL` if using a preview deployment. Exports include personal data and deck links; keep them private. `sync` replays saved pending applications after the Sheet receiver is configured. It can be run again safely.

## Rules that keep it working

- Maintain the website question schema in `lib/application-questions.ts`. The browser and receiver share it, so validation stays consistent.
- Do not restore direct server POSTs to Google Forms' public `formResponse` endpoint; reCAPTCHA causes them to fail.
- **Purge the Cloudflare cache after each deploy** that changes the form (Caching > Purge everything), so no visitor gets an old copy that sends answers to the wrong questions.
- If a security header policy (CSP) is added, allow `connect-src 'self' https://api.cars24.com` for application submissions and phone verification.

## Files

| File | What it is |
|---|---|
| `functions/api/apply.js` | Validates and durably records complete applications and decks |
| `functions/_lib/applications.js` | Authenticated Sheet delivery and response helpers |
| `functions/api/admin/applications.js` | Private application retrieval and Sheet replay |
| `functions/api/deck/[[path]].js` | Serves stored decks to reviewers (link includes the secret) |
| `lib/application-questions.ts` | Shared questions and page order |
| `lib/application-validation.ts` | Shared browser/server answer validation |
| `lib/application-form.ts` | Browser submission settings |
| `lib/application-checks.ts` | Field checks (CIN, phone, email, links and so on) |
| `components/Registration.tsx` | The application form UI |
| `docs/apps-script/gsc_sheet_receiver.gs` | Authenticated delivery into the review spreadsheet |
| `scripts/applications.mjs` | Private JSON export and pending application replay |
| `docs/apps-script/gsc_submit.gs` | Legacy public Form receiver; do not use because it also depends on the blocked endpoint |
