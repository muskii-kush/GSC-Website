# Grand Startup Challenge — site

Next.js 14 (App Router) + GSAP ScrollTrigger + Lenis, deployed on Cloudflare Pages.

## Run locally

Requires Node 20 or newer.

```bash
npm ci
npm run dev      # http://localhost:3000
```

This starts Next.js and the Cloudflare Functions API together. Next.js proxies
`/api/apply`, `/api/deck/*` and `/api/admin/*` to Wrangler on port 8788. Applications
and decks are saved in local R2/KV under `.wrangler/local-development`; they do not
appear in the production Google Sheet. Local CSV: `http://localhost:3000/api/admin/export?key=local-development`.
If Next.js is already running, `npm run dev:api` starts only the local backend.
See [Cloudflare's local development guide](https://developers.cloudflare.com/pages/functions/local-development/).

Do not run `npm run build` while `npm run dev` is running (both write to `.next`).

## Deploy

The site is a static export plus Cloudflare Pages Functions in `functions/`
that receive applications. Full steps (build settings, R2 bucket, KV namespace,
`DECK_LINK_SECRET`, Wrangler zip deploy) are in **`docs/DEPLOY-CLOUDFLARE.md`**.

Build the deployable Cloudflare release:

```bash
npm run build:cloudflare   # → ./IT-handoff/GSC-Website-deploy-ready.zip
```

Deploy the generated `IT-handoff/GSC-Website-deploy-ready/out` directory to the
existing Cloudflare Pages project. The GitHub Pages workflow has been removed;
pushing the repository is not itself a verified Cloudflare deployment.

## Applications

- Form UI: `components/Registration.tsx`. Shared questions: `lib/application-questions.ts`.
  Browser settings: `lib/application-form.ts`. Shared validation: `lib/application-validation.ts`.
- On submit, answers and the pitch-deck PDF (max 50MB) go to `/api/apply`
  (`functions/api/apply.js`), which validates and records the complete application
  and deck in private R2 storage before confirming receipt. Conditional R2 writes
  prevent duplicate applications, including simultaneous submissions. Existing KV
  applicant entries remain supported.
- The original GSC 2027 Applications / Sheet1 uses `IMPORTDATA` to read
  `/api/admin/export?key=<SHEET_KEY>`. The feed includes all saved R2 applications.
  Google Sheets refreshes imports periodically, so new rows may not appear immediately.
  See `docs/DEPLOY-CLOUDFLARE.md` for deployment and import refresh instructions.
- Drafts autosave in the applicant's browser (localStorage).
- Submission retries check `/api/application/status` for an existing receipt before
  uploading again and after a lost response. Receipt recovery requires the verified
  mobile number saved on that application; genuine company/email conflicts remain blocked.
- Run `npm run test:application` to verify storage, validation, retries and delivery.

## Phone verification

Applicants verify their Indian mobile number through a custom OTP screen styled to
match the site. `lib/otp-auth.ts` calls the production BFF directly:

- `POST https://api.cars24.com/gw/plt/bffsvc/api/v1/otp/generate`
  with `{ "identifier": "+91<mobile number>" }`.
- `POST https://api.cars24.com/gw/plt/bffsvc/api/v1/otp/verify`
  with `{ "identifier": "+91<mobile number>", "otp": "<code>" }`.

The OTP input accepts four digits. Retry becomes available after 30 seconds and
calls the generate endpoint again with the same identifier, then
restarts the 30-second countdown after a successful send.

Verification opens the application only when the API returns `{ "verified": true }`.
No token is required or saved. Verification state lasts for the current page;
reloading the page requires phone verification again. Application drafts still
autosave independently in local storage.

## Unused code

`app/api/**`, `lib/server/*`, `lib/registration.js` and `lib/registration-markup.ts`
are an earlier phone-OTP account backend that the site no longer uses; the build
removes `app/api`.

## Where things are

- Copy, dates and contact email: `lib/content.ts`
- Brand tokens: top of `app/globals.css`; trapezoid shapes: `lib/trapezoid.ts`
- Page composition: `app/page.tsx`; components in `components/`
- Media (logos, photos, hero video): `public/media/`
- `asset()` in `lib/asset.ts` prefixes media paths with `NEXT_PUBLIC_BASE_PATH`
