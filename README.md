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

## Phone verification

Register checks the saved Bifrost session before opening the application. Signed-out
applicants verify their Indian mobile number through a custom OTP screen styled to
match the site. `lib/bifrost-client.ts` contains the headless `sendOtp`,
`verifyOtpAndGetCode`, `exchangeCodeForTokens`, PKCE, and login initiation methods
adapted from the Omniauth source. `lib/bifrost-auth.ts` coordinates these methods,
following `verify-portal-ui`, with no SDK dependency.
Tokens persist in the browser. When `gsc_accessToken` is present in local storage,
Register opens the application immediately without introspection or refresh calls.
The OTP input accepts six digits. Retry becomes available after 30 seconds and
calls the client's `sendOtp` again with the same flow and `resend_otp: true`, then
restarts the 30-second countdown after a successful send.

After verification, `exchangeCodeForToken` calls the local client's `exchangeCodeForTokens`
with the returned code and the original PKCE verifier. Local storage contains the
raw access token at `gsc_accessToken`, optional `gsc_refreshToken` and
`gsc_sessionId` values, and the full `gsc-bifrost-session-v1` record.
For the website redirect URI `https://gsc.cars24.com`, `middleware.ts`
returns redirected fetch callbacks as JSON so the local client can read the code.
`functions/_middleware.js` provides the same callback behavior on Cloudflare Pages;
include `lib/bifrost-callback.ts` and `lib/bifrost-config.ts` with the functions when
packaging a deployment.

All Bifrost settings are hardcoded in `lib/bifrost-config.ts`: auth API
`https://auth-service-stage.qac24svc.dev`, redirect URI `https://gsc.cars24.com`, and
client ID `client_4oBqpbGsDOaHJ_pxcvIlNA`. Development, production builds, and
Cloudflare Functions read this same config; Bifrost env variables are not used.
Edit the config and rebuild to change auth settings for a deployment.
Token exchange runs in the browser using the local client; no private SDK registry
authentication is required to install the project dependencies.

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
