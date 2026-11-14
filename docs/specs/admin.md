# Admin: the deck editor

Status: plan, not built. Not in the product spec; agreed in chat 2026-11-13.

A private area where the team manages the deck: see every card and question, switch them on and off, fix question texts in all eight languages (the six machine translations especially), change card attributes and replace card images. Admins are separate from app users.

## Decisions

- **Separate admin accounts.** Own table, own sessions and cookie, own sign-in page. An app account never becomes an admin and an admin is not an app user.
- **The database is the source of truth** once admin exists. `deck.json` seeds a fresh database; `deck:import` only adds what's missing and never overwrites admin edits. "Export deck.json" writes the current deck back to the repo when wanted.
- **Edits apply to new draws only.** Diary entries keep the card and question they were made with (stored by id and index), even if that card or question is later disabled or reworded. A card that's open right now in someone's daily ritual stays until they save or close it.
- Basic security only (CLAUDE.md scope): hashed passwords, short sessions, rate limiting, an edit log. No 2FA, no IP allowlists for now.

## Data model (`packages/db`)

New tables:

| Table | Columns |
| --- | --- |
| `admins` | id, email (unique), password_hash (argon2id), name, created_at, last_login_at, disabled_at |
| `admin_sessions` | id, admin_id → admins (cascade), token_hash (unique), expires_at, created_at |
| `admin_changes` | id, admin_id, entity (`card` / `question`), card_id, question_index (null for cards), field, before (jsonb), after (jsonb), created_at |

New columns:

| Table | Column | Purpose |
| --- | --- | --- |
| `cards` | `enabled` boolean, default true | off = never drawn anywhere |
| `cards` | `image_version` int, default 0 | bumps on upload; part of the image key and cache-busting |
| `cards` | `updated_at` | |
| `questions` | `enabled` boolean, default true | off = never picked |
| `questions` | `review` jsonb, default `{}` | per language: `"machine"` / `"reviewed"`; uk and en start as `"reviewed"` (the author's), the other six as `"machine"` |
| `questions` | `updated_at` | |

Existing editable fields: `cards.tone`, `cards.is_resource`, `cards.image_key`; `questions.text` (jsonb, all 8 languages), `questions.tone`, `questions.needs_request`.

## Rules (`packages/core`, pure, with unit tests)

- `playableCards(deck)`: enabled, has an image, at least one enabled question. Used by the daily card, repicks, the difficult-day card, shadow cards and rooms; today each builds on `deck.playable`.
- `pickQuestion` chooses only among enabled questions (it already filters by tone and by `needsRequest`).
- `deckEditAllowed(deck, change)` refuses changes that would break a flow:
  - the support card (`SUPPORT_CARD`, card 11 question 3) and its question can't be disabled or lose their image;
  - a card can't lose its last enabled question while it's enabled;
  - the deck can't drop below the cards a flow needs: enough light/neutral cards for six daily picks (1 + 5 repicks), enough for a 3-card room spread, at least one shadow card while shadow cards are on.
- Question text: every language required (no empty strings), length 1–300, trimmed.

## API (`apps/api`, `/v1/admin/*`)

All behind `requireAdmin` except sign-in. Separate cookie `svity_admin`: httpOnly, Secure, SameSite=Strict, path `/v1/admin`, 12 hours, no "remember me". CORS as for the app. Responses carry `cache-control: no-store`.

| Method | Path | |
| --- | --- | --- |
| POST | `/v1/admin/auth/signin` | rate limit 5 / 15 min per IP and per e-mail |
| POST | `/v1/admin/auth/signout` | |
| GET | `/v1/admin/me` | |
| GET | `/v1/admin/cards` | all 117: number, thumbnail URL, enabled, tone, resource, image quality, enabled questions, languages still `machine`, times drawn (daily + rooms), diary entries |
| GET | `/v1/admin/cards/:id` | card + 3 questions with all languages, review flags, usage per question |
| PATCH | `/v1/admin/cards/:id` | `enabled`, `tone`, `isResource` |
| PATCH | `/v1/admin/cards/:id/questions/:index` | `enabled`, `tone`, `needsRequest`, `text` (partial per language), `review` |
| PUT | `/v1/admin/cards/:id/image` | multipart upload (below) |
| GET | `/v1/admin/changes` | edit log, newest first, filter by card |
| GET | `/v1/admin/export` | the current deck in `deck.json` format, as a download |

Every write goes through `deckEditAllowed`, records `admin_changes` (one row per changed field) and reloads the deck cache: today `deckLoader` loads once per process, so it gets a `reload()`. With one API replica that's enough; with several, replicas would need a reload signal (Postgres `LISTEN/NOTIFY`), noted for later.

Contracts (`packages/contracts`): `AdminSignInInput`, `AdminCardPatch`, `AdminQuestionPatch`, `AdminCardView`, `AdminCardDetail`, `AdminChange`.

## Card images

- Upload: JPEG, PNG or WebP, up to 15 MB; at least 800 px on the short side; portrait close to the card ratio (warn, don't block).
- The API converts with `sharp` to WebP, long side 1600 px, strips metadata, and stores `cards/<id>-v<version>.webp`. The previous version is kept for rollback.
- Storage: a **Railway Bucket** (S3-compatible) in production; a local folder in development. The image route reads the bucket first, then falls back to the bundled `apps/api/card-images/` (today's 117 files), so nothing moves until a card is replaced.
- Signed, expiring URLs as today; the version is part of the signed path, so a new image shows at once.
- The deck view flags the 19 cards that only have 240 px thumbnails.

## Admin UI (`apps/web`, `/[locale]/admin`)

- `noindex`, not linked from the site, no app header or footer. Interface in uk/en through i18n (`admin` namespace); other site languages fall back to English.
- **Sign in**: e-mail + password.
- **Deck**: a grid of all 117 cards (the image, the number, small badges: off, shadow, light, resource, low-res, "N languages to review"). Filters: on/off, tone, low-res, needs review; search by number or by question text in any language. Counts at the top (on / off / to review).
- **Card**: the large image with "Replace image"; switches for on/off, tone, resource; usage. Below, the three questions: on/off, tone, "needs a request", and the text in eight languages side by side with uk and en as reference, each with a machine / reviewed toggle. Save per question; "Saved" or the reason a change was refused (e.g. "the support card can't be disabled").
- **Changes**: the edit log (who, when, card / question, field, before → after).
- **Export**: download `deck.json`.

Mobile: usable on a phone (one column), but built for a laptop.

## Admin accounts

- `pnpm admin:create <email> [name]`: asks for the password in the terminal (hidden input, min 12 characters) and creates the admin. Run locally or on Railway (`railway run`).
- `pnpm admin:disable <email>`: sets `disabled_at` and ends their sessions.
- No sign-up, no "forgot password" in the UI: a new password is set with `admin:create --reset`.

## `deck:import` after this

- Inserts cards and questions that don't exist.
- For existing questions, fills only languages that are missing; never overwrites a text, flag, tone or image the database already has.
- Prints what it added and what it left alone.

## Milestones (one commit each, verified in the browser)

1. **Accounts**: tables, CLI, sign-in/out, `requireAdmin`, rate limit, empty `/admin` shell.
2. **Read-only deck**: grid with filters and search; card page with questions in all languages and usage.
3. **On/off and attributes**: core rules with tests, PATCH endpoints, cache reload, edit log, `deck:import` change; every flow (daily, repick, difficult day, shadow, rooms) respects disabled cards and questions.
4. **Texts and review**: editing in eight languages, the review flags, search by text.
5. **Images**: bucket, upload with conversion, versioned signed URLs, low-res flags.
6. **Export** and the **Changes** page.

## Open questions

- Who are the admins: only you, or the author and translators too? (Translators could later get a role that can edit text but not switch cards off.)
- Should disabling a card also hide it from users' diaries? This plan says no.
- Railway Bucket costs a few cents a month at this size. Fine?
