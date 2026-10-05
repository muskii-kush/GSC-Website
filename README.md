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
rm -rf app/api && STATIC_EXPORT=true NEXT_PUBLIC_STATIC_SITE=true npm run build   # → ./out
```

`.github/workflows/pages.yml` also publishes the static pages to GitHub Pages on
every push to `main` (only while the repo is public); the application form does
not submit there because GitHub Pages cannot run the functions.

## Applications

- Form UI: `components/Registration.tsx`. Questions, page order and Google Form
  entry IDs: `lib/application-form.ts`. Answer checks: `lib/application-checks.ts`.
- On submit, answers and the pitch-deck PDF (max 50MB) go to `/api/apply`
  (`functions/api/apply.js`), which stores the deck in R2, blocks duplicate
  applications (KV), and submits the answers to the Google Form, so responses
  land in the Form's response Sheet. Keep the entry IDs in sync with the Form.
- Drafts autosave in the applicant's browser (localStorage).

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
