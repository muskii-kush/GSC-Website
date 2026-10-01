# Grand Startup Challenge site: deploying on Cloudflare Pages

This is everything needed to put the site live on Cloudflare, including the application form.

## How applications work

1. A founder fills in the application on the website (`components/Registration.tsx`) and attaches their pitch deck (PDF, up to 50MB).
2. The site sends the answers and the deck to `/api/apply`, a Cloudflare Pages Function in this repo (`functions/api/apply.js`).
3. The function stores the deck in a private R2 bucket, then submits every answer to the Google Form, with a link to the stored deck in the "Pitch deck link" question.
4. Responses appear in the Google Form's Responses tab and linked Sheet, as normal. Deck links open through `/api/deck/...` (`functions/api/deck/[[path]].js`).
5. A second application with the same email or CIN/LLPIN is refused (Cloudflare KV).

No Google sign-in is needed by applicants. The Google Form must not contain a file upload question.

## Deploying from the zip files (no Git access)

Two zips are provided:

- **GSC-Website-deploy-ready.zip**: the built site (`out/`) plus the server functions (`functions/`). Use this to deploy as is.
- **GSC-Website-source.zip**: the full source, if you want to build it yourself.

Deploy with Wrangler (the dashboard's drag-and-drop upload does not include the `functions/` folder, so the application form would not work):

```
unzip GSC-Website-deploy-ready.zip && cd GSC-Website-deploy-ready
npx wrangler login
npx wrangler pages project create gsc-website     # first time only
npx wrangler pages deploy out --project-name gsc-website
```

Run the deploy command from the folder that contains both `out/` and `functions/`. Then add the bindings and secret in section 2 (Pages project > Settings) and deploy once more.

To build from source instead: `npm ci`, then `rm -rf app/api`, then `STATIC_EXPORT=true NEXT_PUBLIC_STATIC_SITE=true npm run build` (Node 20). The output is in `out/`.

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

1. Open `https://<domain>/#register`, fill the form with clearly marked test data, attach a small PDF and submit. The page should say "application received".
2. In the Google Form > Responses, confirm the test response is there and the "Pitch deck link" opens the PDF.
3. Delete the test response in the Form, the deck in R2 (bucket > object), and the two KV keys (`email:...`, `cin:...`) so the test email and CIN can be reused.

If the page shows an error instead, check Pages project > Functions > Real-time logs. Messages starting "Form rejected the submission" mean the Google Form no longer matches the site (see below).

## Rules that keep it working

- **Do not delete, re-create or add required questions in the Google Form** while applications are open. The site sends answers by question ID (`lib/application-form.ts`, `functions/api/apply.js`). Rewording titles or help text is safe.
- **No file upload questions in the Form.** They force Google sign-in and every submission from the site is rejected.
- **Purge the Cloudflare cache after each deploy** that changes the form (Caching > Purge everything), so no visitor gets an old copy that sends answers to the wrong questions.
- If a security header policy (CSP) is added, allow `connect-src 'self'` (the form posts to its own domain only).

## Files

| File | What it is |
|---|---|
| `functions/api/apply.js` | Receives applications, stores decks, submits to the Google Form |
| `functions/api/deck/[[path]].js` | Serves stored decks to reviewers (link includes the secret) |
| `lib/application-form.ts` | The questions shown on the site, mirrored from the Google Form |
| `lib/application-checks.ts` | Field checks (CIN, phone, email, links and so on) |
| `components/Registration.tsx` | The application form UI |
| `docs/apps-script/gsc_submit.gs` | Alternative receiver on Google Apps Script, if the Workspace admin allows public web apps. Not used with Cloudflare. |
