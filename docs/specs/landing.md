# Landing page (M0)

Status: draft · Languages: `uk`, `en` · Source: product spec §2, §3, §6, §8, §10, §11, §13, §14

The landing page is the first thing we ship. It is rich from day one: every section below is in v1. Later milestones swap demos for the real product (the daily-card demo becomes the real ritual in M1; sign-up goes live in M4).

## Goals
1. Show what Svity is in 10 seconds: one card a day, a question, a quiet space; and a room for psychologists.
2. Let visitors feel the ritual (interactive demo, no account).
3. Turn visitors into accounts: sign-up for yourself or as a psychologist (self-service, no applications).

## Routes and i18n
- `/uk/` and `/en/`, static (SSG), `hreflang` alternates + `x-default` → `/en/`.
- `/` redirects by `Accept-Language`: `uk` → `/uk/`, everything else → `/en/` (next-intl). The header switcher remembers the choice (`NEXT_LOCALE` cookie).
- `?theme=day|evening` forces a theme without saving it (handy for checks and sharing).
- All copy in `packages/i18n` messages. No address-form (gender) is known on the landing, so all Ukrainian copy uses neutral phrasing (no gendered past-tense verbs).
- Informal "ти" / "you" everywhere (spec §14).

## Page structure

| # | Section | Behavior |
|---|---|---|
| 1 | Header | Logo SVITY, anchors (Як це працює / Колода / Для психологів / Питання), language switch, theme switch (auto/day/evening), one action button ("Get started" → /start, or "Open" → /today when signed in). Fixed full-width bar; after scrolling only a glass background fades in (no size or position change). |
| 2 | Hero | Slogan, subline, two CTAs (Start free → /signup / for psychologists), "Already have an account? Sign in"; signed in: Go to today's card / My diary. Card back floats (6 s loop), the star glows softly, clouds drift with light parallax. |
| 3 | What Svity is (anchor `#how`, the nav's "How it works") | Lead line, "how the mirror works" (a real card + image → question → your answer), four principles (not fortune-telling · no right answers · you decide what to share · safe at every step), a note on what MAC are. |
| 4 | Try today's card (demo) | The ritual, fully client-side, with a step tracker; see "Demo" below. |
| 5 | The deck | A strip of card art inside the page width (max 1100 px, soft faded edges) that drifts on its own, pauses on hover, swipes on touch; cards are not interactive. Three features: 117 worlds · questions just for you (they open when the card is yours; never shown here) · two languages. |
| 6 | Diary & month | A sample diary page (card, date, favourite, note, before → after; the question shown only as "the question is yours alone"), three features (card + note + feelings · favourites · private, download or delete any time), and a sample month: weekday header, 12 card thumbnails by the 20th, today outlined, "lighter after the card" bar (9 of 12). |
| 7 | Shadow cards | Always evening. Door illustration (311:5) with a slow gold glow; lead (anger, sadness, fear; opened by practice and consent, never payment); a four-step path (a month of practice → your consent → a shadow card in evening mode → back to the body: breathing 4·4·6 + support card), horizontal on desktop, vertical on phones; a care strip: how they appear (only when I ask · sometimes as the daily card · turn off any time) + the soft stop and the help button. |
| 8 | For psychologists | Heading + three steps (create a room → the client draws on their phone → you see only shared cards), CTA "Create a psychologist account" + "Free during the beta"; playable room mock (pro screen on a solid surface, client phone beside it on desktop, below it on phones; "Waiting" in empty slots); six feature tiles: 1 or 3 cards · face down or up · prompts just for you · private notes · question for the week · link and PIN (24/72 h, no account for the client). |
| 9 | Safety | Heading + lead (reflection tool, not therapy or an emergency service); four items: help in one tap · difficult day · leave without saving · shadows only with consent; a decorative help sheet as in the app ("I need help" pill, call 112, country, find a helpline, live breathing circle 4·4·6 that stays still with reduced motion, "not an emergency service"). No unverified helpline numbers. |
| 10 | Languages | Heading + lead (six more languages on the way, translated by native speakers with a psychologist); three points: all 351 questions in uk and en · feminine/masculine/neutral address · the room's question language; a panel with one word ("Calm") rotating through all 8 languages (still with reduced motion) and the language chips (uk, en live; six "soon"). |
| 11 | FAQ | Heading + lead left, a "Didn't find an answer?" card with a mailto (below the list on phones); ten numbered questions, one open at a time (`<details name>`), the first open: fortune-telling? · how long · card doesn't speak to me (5 repicks / leave without saving) · who sees my entries · replacement for therapy? · do I need a psychologist · free? · install an app? · printed deck (code later) · psychologist start. |
| 12 | Footer | Logo, language switch, contact e-mail, "Write to the authors" (mailto for now), © Svity. |

A floating help button (lifebuoy icon) is not needed on the landing; it belongs to the app.

## Demo: "Try today's card"
Reuses the ritual component that M1 will use in the product (build it as a real component, not a one-off).

1. "How are you right now?" — 7 feeling chips: Спокій, Надія, Ніжність, Втома, Сум, Тривога, Злість / Calm, Hope, Tenderness, Tiredness, Sadness, Anxiety, Anger. One tap → step 2.
2. Deck with the card back. Hover lifts 4 px, lower cards fan out. Tap → ritual moment: deck lifts, gold glow from the star, 6 gold sparks (1.1 s) → flip (rotateY 180°, 0.9 s, `cubic-bezier(.2,.75,.2,1)`) → `navigator.vibrate(12)` where supported.
3. Card + one random question of its three, in the page language. Optional note field (not stored).
4. "Not my card · take another (N more)" — up to 2 repicks in the demo, no repeats.
5. "How are you now?" — same chips → golden star unfolds (0.9 s) + "This is how a card a day feels. Create an account to get yours every day." + CTA.
- Nothing is sent to the server. Reload starts over.
- `prefers-reduced-motion`: no glow, sparks or flip; a cross-fade instead.

Demo cards (provisional; the author must approve): 11, 12, 20, 21, 22. Card 18 was dropped: no high-res file exists. Questions are from the prototype:

| Card | EN | UK |
|---|---|---|
| 11 | Whom or what would you like to hold just like this, with your eyes closed? · Which part of you needs this same tenderness? · How does your body tell you that you are safe? | Кого або що тобі хочеться обійняти так само – із заплющеними очима? · Яка частина тебе потребує такої самої ніжності? · Як твоє тіло підказує тобі, що ти в безпеці? |
| 12 | Who are you in this card: the one holding or the one being held? · Who keeps you afloat, even when you don't notice it? · What would help you trust others with your weight, even a little? | Ким ти себе бачиш на цій карті – тим, хто тримає, чи тим, кого тримають? · Хто тримає тебе на плаву, навіть коли ти цього не помічаєш? · Що допомогло б тобі довірити свою вагу іншим – хоча б трохи? |
| 21 | What do you see deep in this garden, and what draws you there? · What in your life is already blooming, though it once seemed hopeless? · What do you need to take the first step under this arch? | Що ти бачиш у глибині цього саду – і що тягне тебе туди? · Що в твоєму житті вже квітне, хоча колись здавалося безнадійним? · Що тобі потрібно, щоб зробити перший крок під цю арку? |
| 20 | If one of these keys were the one you need right now, which door would it open? · Which keys are already in your pocket while you keep looking for new ones? · Who could help you find the right key? | Якби один із цих ключів був потрібний тобі саме зараз, – які двері він відчинив би? · Які ключі вже лежать у тебе в кишені, поки ти шукаєш нові? · Хто міг би допомогти тобі знайти потрібний ключ? |
| 22 | What is written in the open book lying here? · What must be in your cozy corner, and what will definitely not be there? · What do you want to hide from, and what do you simply want to rest from? | Що написано в книзі, яка лежить тут відкритою? · Що обов'язково має бути у твоєму затишку – і чого там точно не буде? · Від чого тобі хочеться сховатися – і від чого просто відпочити? |

Shadow candidates (26, 29, 65, 68, 69, 76, 81, 96, 100) and the 14 flagged questions (spec §3) never appear on the landing.

## Copy (draft; the author reviews UK)

| Key | EN | UK |
|---|---|---|
| hero.title | One card a day to meet yourself | Одна карта на день, щоб зустрітися із собою |
| hero.sub | …and a room for the work you do together with your psychologist. | …і кімната для роботи, яку ви робите разом із психологом. |
| hero.cta1 | Start free | Почати безкоштовно |
| hero.cta2 | For psychologists | Для психологів |
| demo.title | Try today's card | Спробуй карту дня |
| demo.ask | How are you right now? | Як ти зараз? |
| demo.tap | Tap the deck | Торкнися колоди |
| demo.repick | Not my card · take another ({n} more) | Не моя карта · взяти іншу (ще {n}) |
| demo.note | A word, a page, or nothing at all | Слово, сторінка або нічого |
| demo.after | How are you now? | Як ти тепер? |
| demo.done | This is how a card a day feels. Create an account to get yours every day. | Так відчувається карта дня. Створи акаунт, щоб отримувати свою щодня. |
| principles.1 | It's not fortune-telling. Cards predict nothing; they are a mirror. | Це не ворожіння. Карти нічого не передбачають – це дзеркало. |
| principles.2 | There are no right answers. Write a word, a page, or nothing. | Правильних відповідей немає. Можна написати слово, сторінку або нічого. |
| principles.3 | You decide what to share. Your diary is private, even from your psychologist. | Ти вирішуєш, чим ділитися. Щоденник приватний, навіть від психолога. |
| how.steps | How you feel · A card · A question · A note, if you want · How you feel now | Як ти почуваєшся · Карта · Питання · Нотатка, якщо хочеться · Як ти тепер |
| deck.title | The deck "Svity" | Колода «Світи» |
| deck.sub | 117 painted cards and 351 questions in Ukrainian and English. Arches, vases, chequered floors and the sea. | 117 мальованих карт і 351 питання українською та англійською. Арки, вази, шахова підлога й море. |
| diary.title | Your month in cards | Твій місяць у картах |
| diary.sub | Every card stays in your diary with its question, your note and how you felt before and after. Come back when it helps. | Кожна карта лишається у щоденнику – з питанням, нотаткою і тим, що ти відчуваєш до і після. Повертайся, коли це допомагає. |
| shadow.title | Shadow cards | Тіньові карти |
| shadow.sub | After a month of practice, you can open cards about anger, sadness and fear: only if you choose to, never for money. After each one: a breath and a supporting card. | Після місяця практики можна відкрити карти про злість, сум і страх – лише якщо ти цього хочеш, і ніколи не за гроші. Після кожної – дихання і карта-опора. |
| pro.title | A room for your sessions | Кімната для твоїх сесій |
| pro.sub | Send a link. Your client draws cards on their phone; you see only the cards they choose to share. | Надішли посилання. Клієнт тягне карти на своєму телефоні, а ти бачиш лише ті, якими клієнт ділиться. |
| pro.features | 1 or 3 cards: What is · What's in the way · What will help · Face-down or face-up choice · Prompts and deepening questions for you · Private session notes · A question for the week sent to the client's diary | 1 або 3 карти: Що є · Що заважає · Що допоможе · Вибір наосліп або відкрито · Підказки й поглиблювальні питання для тебе · Приватні нотатки сесії · Питання на тиждень – у щоденник клієнта |
| pro.cta | Create a psychologist account | Створити акаунт психолога |
| safety.title | Gentle by design | Бережно з першого дотику |
| safety.sub | Help is one tap away on every screen. Any card can be closed without saving. On a hard day, Svity offers a soft card and a breath instead of a question. | Допомога – в один дотик на кожному екрані. Будь-яку карту можна закрити без збереження. У важкий день Svity запропонує м'яку карту й дихання замість питання. |
| langs.title | In your language | Твоєю мовою |
| form.tab.user | For me | Для себе |
| form.tab.pro | For my clients | Для моїх клієнтів |
| form.success | Thank you. We'll write when Svity is ready for you. | Дякуємо. Ми напишемо, щойно Svity буде готова для тебе. |

### FAQ
1. Is this fortune-telling? / Це ворожіння? — No. Metaphorical cards are a tool psychologists use to work with images. A card is a reason to ask yourself a question.
2. Do I need a psychologist? / Чи потрібен мені психолог? — No. The daily card works on its own. If you have a psychologist, you can work with the cards together.
3. Is it free? / Це безкоштовно? — The daily card, diary, check-ins and help are free. Extra practices will be part of Svity Plus.
4. I have the printed deck. / У мене є друкована колода. — The code in the box will unlock Svity Plus for 12 months.
5. Which languages? / Якими мовами? — Ukrainian and English at launch; six more soon.
6. When can I start? / Коли можна почати? — Right now: create an account, it's free.
7. I'm a psychologist. How do I start working with clients? / Я психолог. Як почати працювати з клієнтами? — Create an account as a psychologist, or turn on "Sessions with clients" in the profile; the cabinet opens right away.

## Forms
- No forms on the landing: accounts are created on /signup (`?role=professional` preselects the psychologist choice). Signed-in state comes from `/v1/me` with a localStorage hint (`apps/web/src/lib/session.ts`).

## Design and assets
- Tokens from spec §13: Pearl Ivory background, Deep Ink text, Ocean Breeze buttons, gold decoration only, Night palette for evening. Fonts: Cormorant Garamond 500 (headings, questions, logo with 0.08em letter-spacing) and Manrope 400–700.
- Assets:
  - App icon: Figma 311:2. Illustrations: 311:3 (diary), 311:4 (moon in cloud), 311:5 (door). 1024×1024 each.
  - Full Figma export (128 PNGs, mostly 1882×3344) lives outside the repo; optimized WebP copies go in `apps/web/public/cards` (720 px demo/back, 560 px gallery).
  - Card back: `image 53.png` in the export (941×1672).
  - Card number ↔ file for all 117 cards: see `packages/db/deck/deck.json` (`exportFile`), derived from the thumbnails in the questions PDF v3. Card 14 is image 174 (cropped differently); 19 cards have no high-res file yet.
- Mobile-first. Lighthouse targets: performance ≥ 90, accessibility ≥ 95 on mobile.

## Acceptance
Checked by hand in the browser (desktop and mobile width):
- Both languages render every section with no missing keys (TypeScript-typed message keys catch most of this).
- Demo works with mouse, touch and keyboard; reduced-motion variant works.
- Forms validate on client and server; submissions land in Postgres.

## Open
- Author approval of the demo and gallery cards, and the UK copy.
- Domain (`svity.app`?) and contact e-mail.
