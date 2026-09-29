# Grand Startup Challenge — site

Next.js 14 (App Router) + GSAP ScrollTrigger + Lenis, with API routes for
candidate accounts and applications.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Do not run `npm run build` while `npm run dev` is running (both write to `.next`).

## Registration flow

1. Candidate enters **email + mobile number** (Indian mobiles, stored as `+91XXXXXXXXXX`).
2. `POST /api/auth/send-otp` sends a 6-digit OTP to the phone (valid 10 minutes).
3. `POST /api/auth/verify-otp` checks it; the **account is created** on first
   verification and a 30-day HttpOnly session cookie is set.
4. The 7-step application opens. Answers autosave to the account
   (`PUT /api/application`) and are submitted with `POST /api/application/submit`,
   which checks every required answer and then locks the application.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/send-otp` `{ email, phone }` | Send OTP |
| `POST /api/auth/verify-otp` `{ phone, code }` | Verify, create account, sign in |
| `GET /api/auth/me` | Current account |
| `POST /api/auth/logout` | Sign out |
| `GET / PUT /api/application` | Load / save draft |
| `POST /api/application/submit` | Final submission |

Protections: OTPs are stored as HMAC hashes, 5 wrong attempts per code, 30s
resend cooldown, max 5 codes per phone and 20 per IP per hour, one email per
phone number, only known form fields are stored.

## Configuration

Copy `.env.example` to `.env.local`.

- `DATABASE_URL` — hosted Postgres (Supabase, Neon, RDS…). Required in production;
  tables are created automatically on first request. Locally, leave it unset and
  an embedded database is created in `./.data`.
- `OTP_SECRET` — required in production (`openssl rand -hex 32`).
- `SMS_PROVIDER` — only `mock` exists today: the OTP is printed in the server log
  and shown in the form ("Test mode") on non-production builds. To go live, add a
  provider (Twilio Verify, MSG91, …) in `lib/server/sms.ts`. **Do not launch with
  the mock provider** — anyone could register any number.

## Where things are

- Copy and data: `lib/content.ts`
- Brand tokens: top of `app/globals.css`; trapezoid shapes: `lib/trapezoid.ts`
- Registration UI: `lib/registration.js`, markup in `lib/registration-markup.ts`
- Backend: `app/api/**`, `lib/server/*` (db, auth/OTP/sessions, SMS, field rules)
- Media: `public/media/`
