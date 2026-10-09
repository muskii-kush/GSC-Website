# Grand Startup Challenge — site

Next.js 14 (App Router) + GSAP ScrollTrigger + Lenis, deployed on Cloudflare Pages.

## Run locally

Requires Node 18.17+ (CI uses Node 20).

```bash
npm ci
npm run dev      # http://localhost:3000
```

Do not run `npm run build` while `npm run dev` is running (both write to `.next`).

## Deploy

The site is a static export plus two Cloudflare Pages Functions in `functions/`
that receive applications. Full steps (build settings, R2 bucket, KV namespace,
`DECK_LINK_SECRET`, Wrangler zip deploy) are in **`docs/DEPLOY-CLOUDFLARE.md`**.

Build command used on Cloudflare:

```bash
npm run build:cloudflare   # → ./IT-handoff/GSC-Website-deploy-ready.zip
```

`.github/workflows/pages.yml` also publishes the static pages to GitHub Pages on
every push to `main` (only while the repo is public); the application form does
not submit there because GitHub Pages cannot run the functions.

## Applications

- Form UI: `components/Registration.tsx`. Shared questions: `lib/application-questions.ts`.
  Browser settings: `lib/application-form.ts`. Shared validation: `lib/application-validation.ts`.
- On submit, answers and the pitch-deck PDF (max 50MB) go to `/api/apply`
  (`functions/api/apply.js`), which validates and records the complete application
  and deck in private R2 storage before confirming receipt. Conditional R2 writes
  prevent duplicate applications, including simultaneous submissions. Existing KV
  applicant entries remain supported.
- Google Forms' public endpoint requires reCAPTCHA and rejects server submissions.
  Optional authenticated Sheet delivery uses `docs/apps-script/gsc_sheet_receiver.gs`.
  Applications remain saved if delivery fails and can be exported or replayed using
  `scripts/applications.mjs`. See `docs/DEPLOY-CLOUDFLARE.md` for setup.
- Drafts autosave in the applicant's browser (localStorage).
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
