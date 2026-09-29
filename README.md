# Grand Startup Challenge — site

Next.js 14 (static export) + GSAP ScrollTrigger + Lenis.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static site in ./out
```

- Copy and data: `lib/content.ts` (from Grand-Startup-Challenge-v5.html)
- Brand tokens: top of `app/globals.css` (from cars24-creatives/cars24-social-tokens.css)
- Brand trapezoid shapes: `lib/trapezoid.ts`, `components/Shape.tsx`
- Registration (OTP + wizard + Apps Script sync): `lib/registration.js`, markup in `lib/registration-markup.ts`
- Media extracted from the original HTML: `public/media/`

Do not run `npm run build` while `npm run dev` is running (both write to `.next`).
