# Svity

Web app for daily reflection with the metaphorical card deck "Світи" (117 cards, 351 questions) and online sessions where a psychologist and client work with the cards in a shared room. Web first; a mobile app (likely Expo) follows later and must reuse the backend and domain logic.

## Sources of truth
- `Svity — проектная документация.md` (Russian): full product spec. Read the relevant section before building a feature.
- `docs/specs/*.md` (English): implementation specs per feature, derived from the product spec. When they conflict with the product spec, ask.
- Prototype: https://claude.ai/artifact/TUC6AjDNZJ1WTHPrJUFwUo (screens, copy, motion).
- Figma (working copy): https://www.figma.com/design/L1k6I597bs6pfR6y3TUPQV (card art; layers 311:2–311:5 = app icon + illustrations).

## Scope rules
- Do not build GDPR/legal/compliance machinery (consent audit, DPA, envelope encryption, double opt-in, watermarking) unless asked. Basic security only: hashed secrets, rate limiting, standard auth, HTTPS, signed image URLs.
- Product safety features from the spec are in scope (help button, "Трудний день" mode, safe exit).
- Languages: 8 everywhere (`uk`, `en`, `de`, `pl`, `cs`, `it`, `es`, `fr`; `siteLocales` = `locales` in contracts): landing, app, e-mails, accounts and the 351 card questions (`text` per language in `deck.json`). `uk` and `en` are the author's; the other six (UI and questions) are machine-translated: get native review, and the author's review of the questions, before relying on them. A key missing in a language falls back to English. The account language follows the page language the user opens the app in. All UI text goes through i18n; no hard-coded strings, no text in images.

## Architecture (pnpm monorepo, TypeScript strict)
```
apps/api            Hono on Node: REST API (auth, daily card, diary, rooms); rooms push role-specific snapshots over WebSocket (@hono/node-server + ws)
apps/web            Next.js: marketing/landing (SSG) + app UI
packages/core       pure domain rules (timer, card selection, repicks, shadow access, entitlements); `pnpm --filter @svity/core test`
packages/contracts  Zod schemas = API contract (web now, mobile later)
packages/db         Drizzle schema, migrations, deck import
packages/i18n       ICU messages in 8 languages (missing keys fall back to English); gendered forms via `select`
packages/tokens     design tokens (colors, radii, motion) as TS
docs/specs          feature specs
```

Rules:
- Business rules live in `packages/core` as pure functions, never in React components or route handlers. Handlers validate (contracts), call core/services, and persist.
- The server is authoritative for the daily card (which card, timer, repicks) and rooms (the psychologist receives only confirmed cards and a return count).
- Time logic uses calendar arithmetic in the user's profile time zone (DST-safe), never `+24h`.
- Testing is light for now: unit tests only for tricky `core` rules (timer/DST, repick limits, shadow eligibility). No CI, integration or E2E suites unless asked. Verify features by running them.

## Design
Palette, fonts, glass and motion rules: product spec §13. Cards are never under glass; gold is decoration only, never text or buttons. Respect `prefers-reduced-motion`. Mobile-first; test iOS Safari behavior (backdrop-filter, 100dvh).

## Commands
```
cp .env.example .env          # first time
pnpm install
pnpm db:up                    # Postgres on :5433 + Mailpit (SMTP :1025, inbox http://localhost:8025)
pnpm db:migrate               # apply migrations (pnpm db:generate after schema changes)
pnpm deck:import              # load packages/db/deck/deck.json (cards + questions); safe to re-run
pnpm user:role <email>        # switch an account to psychologist (or `personal`); users can also do it at sign-up / in the profile
pnpm dev                      # api on :4000 + web on :3000 (or dev:api / dev:web)
pnpm typecheck
```
Landing: http://localhost:3000/uk or /en; `?theme=day|evening` forces a theme.
App: http://localhost:3000/uk/signup or /uk/signin (e-mail + password) → /today (daily card), /diary, /profile, /shadow, /difficult-day; psychologists: /cabinet → room links /r/XXX-XXX (client, phone-first). Session rooms are behind `roomsOpen` in `packages/contracts` (now `false`: sign-up is personal only, the API refuses the psychologist role and pro routes, /cabinet and /r/* are 404). When open, psychologist is self-service: chosen at sign-up ("As a psychologist", or /signup?role=professional) or toggled in the profile ("Sessions with clients"). Auth: e-mail + password (argon2id via node:crypto), 60-day httpOnly session cookie; "Forgot password" e-mails a one-time reset link. E-mail transport via MAIL_TRANSPORT: `smtp` (Mailpit locally), `mailgun` (production, EU API), `console`.
Deck: all 351 questions come from the author's PDF «Світи – додаткові питання до карт» v3; card number ↔ image comes from the thumbnails in the same PDF, matched to the Figma export (`packages/db/deck/deck.json`). 98 cards have high-res art; 19 (1, 13, 17, 18, 19, 38, 40, 57, 59, 61, 65, 82, 92, 112, 113, 114, 115, 116, 117) only have the PDF's 240 px thumbnails until high-res files are exported. Card images are served by the API (`apps/api/card-images`), not from `public/`.
Deploy: Railway, two services from this repo (`apps/api/railway.json`, `apps/web/railway.json` as each service's config file) plus Railway Postgres; the API's pre-deploy runs `db:migrate` and `deck:import`. Web and API need same-site domains (`svity.app` + `api.svity.app`) for the session cookie. Vercel builds are paused (Ignored Build Step) while this lands.
Next.js is v16 (proxy.ts instead of middleware.ts); read `apps/web/node_modules/next/dist/docs/` before using unfamiliar APIs.

## Workflow
- Work milestone by milestone (M0 foundation + landing → M1 daily card → M2 profile & safety → M3 room → M4 hardening).
- Commit and push straight to `main`, no feature branches or PRs: one focused commit per finished, verified step.
- The repo is public: never commit secrets or `.env`; commit as the personal identity (repo-local git config), not a work e-mail.
- Before reporting a task done: typecheck passes and the feature works when run; for UI, check it in a browser (mobile width too).
