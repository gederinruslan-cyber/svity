import { Hono } from "hono";
import {
  DrawError,
  SUPPORT_CARD,
  localDateKey,
  pickQuestion,
  shadowAccess,
  shadowProgress,
  softStop,
  type ShadowAccess,
} from "@svity/core";
import { ShadowDrawInput, ShadowSettings, SaveInput, type EntryView, type Feeling, type Locale, type ShadowView } from "@svity/contracts";
import { and, count, desc, entries, eq, gt, shadowDraws, sql, users, type Db } from "@svity/db";
import type { AuthEnv, User } from "./auth";
import { cardView, type Deck, type ImageSigner } from "./deck";
import { localeOf } from "./today";

type EntryRow = typeof entries.$inferSelect;

/** Everything that decides whether shadow cards may be shown to this user right now. */
export async function shadowState(db: Db, user: User, now = new Date()) {
  const [{ n }] = (await db.select({ n: count() }).from(entries).where(eq(entries.userId, user.id))) as [{ n: number }];
  const recent = await db
    .select({ at: entries.createdAt, before: entries.feelingBefore, after: entries.feelingAfter })
    .from(entries)
    .where(and(eq(entries.userId, user.id), gt(entries.createdAt, new Date(now.getTime() - 14 * 864e5))));
  const progress = shadowProgress({ registeredAt: user.createdAt, entries: n, now, tz: user.timezone });
  const stop = softStop(recent, now, user.timezone);
  const access: ShadowAccess = shadowAccess({ progress, consentAt: user.shadowConsentAt, mode: user.shadowMode, softStop: stop });
  return { progress, softStop: stop, access };
}

export function shadowRoutes(db: Db, getDeck: () => Promise<Deck>, signer: ImageSigner, entryView: (deck: Deck, e: EntryRow, locale: Locale) => EntryView) {
  const app = new Hono<AuthEnv>();

  const today = async (userId: string, day: string) =>
    (await db.select().from(shadowDraws).where(and(eq(shadowDraws.userId, userId), eq(shadowDraws.day, day))).limit(1))[0] ?? null;

  async function view(user: User, locale: Locale, now = new Date()): Promise<ShadowView> {
    const deck = await getDeck();
    const { access, softStop } = await shadowState(db, user, now);
    const draw = await today(user.id, localDateKey(now, user.timezone));
    if (draw?.status === "open") {
      return {
        state: "open",
        card: cardView(deck, signer, draw.cardId, draw.questionIndex, locale),
        support: cardView(deck, signer, SUPPORT_CARD.cardId, SUPPORT_CARD.questionIndex, locale),
        feelingBefore: draw.feelingBefore as Feeling,
      };
    }
    if (draw) {
      const [entry] = await db
        .select()
        .from(entries)
        .where(and(eq(entries.userId, user.id), eq(entries.source, "shadow")))
        .orderBy(desc(entries.createdAt))
        .limit(1);
      return { state: "used", entry: draw.status === "saved" && entry ? entryView(deck, entry, locale) : null };
    }
    if (!access.onRequest) return { state: "locked", softStop };
    return { state: "ready" };
  }

  app.get("/", async (c) => c.json(await view(c.get("user"), localeOf(c))));

  // Consent, mode and "turn off" (spec §8.2–8.4). Turning on needs the thresholds and no soft stop.
  app.put("/settings", async (c) => {
    const parsed = ShadowSettings.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const user = c.get("user");
    const { mode, understood } = parsed.data;
    if (mode) {
      const { progress, softStop } = await shadowState(db, user);
      if (!progress.eligible) return c.json({ ok: false, error: "not_eligible" }, 409);
      if (softStop) return c.json({ ok: false, error: "soft_stop" }, 409);
      if (!user.shadowConsentAt && !understood) return c.json({ ok: false, error: "consent_required" }, 400);
    }
    await db
      .update(users)
      .set({ shadowMode: mode, ...(mode && !user.shadowConsentAt ? { shadowConsentAt: new Date() } : {}) })
      .where(eq(users.id, user.id));
    return c.json({ ok: true });
  });

  /** Same lock as the daily card, so a double tap can't draw two. */
  const locked = <T>(userId: string, fn: (tx: Parameters<Parameters<Db["transaction"]>[0]>[0]) => Promise<T>) =>
    db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      return fn(tx);
    });

  app.post("/draw", async (c) => {
    const parsed = ShadowDrawInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const user = c.get("user");
    const now = new Date();
    const { access } = await shadowState(db, user, now);
    if (!access.onRequest) throw new DrawError("not-available");
    const deck = await getDeck();
    const pool = deck.playable.filter((x) => x.tone === "shadow");
    if (!pool.length) throw new DrawError("deck-empty");
    const card = pool[Math.floor(Math.random() * pool.length)]!;
    await locked(user.id, async (tx) => {
      const day = localDateKey(now, user.timezone);
      const [existing] = await tx.select().from(shadowDraws).where(and(eq(shadowDraws.userId, user.id), eq(shadowDraws.day, day)));
      if (existing) throw new DrawError("not-available");
      await tx.insert(shadowDraws).values({
        userId: user.id,
        day,
        cardId: card.id,
        questionIndex: pickQuestion(card.questions, { hasRequest: false, allowShadow: true }),
        feelingBefore: parsed.data.feelingBefore,
      });
    });
    return c.json(await view(user, localeOf(c), now));
  });

  const openDraw = async (user: User, now: Date) => {
    const draw = await today(user.id, localDateKey(now, user.timezone));
    if (draw?.status !== "open") throw new DrawError("not-open");
    return draw;
  };

  app.post("/save", async (c) => {
    const parsed = SaveInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const user = c.get("user");
    const now = new Date();
    await locked(user.id, async (tx) => {
      const draw = await openDraw(user, now);
      await tx.update(shadowDraws).set({ status: "saved" }).where(eq(shadowDraws.id, draw.id));
      await tx.insert(entries).values({
        userId: user.id,
        cardId: draw.cardId,
        questionIndex: draw.questionIndex,
        feelingBefore: draw.feelingBefore,
        feelingAfter: parsed.data.feelingAfter,
        note: parsed.data.note || null,
        isShadow: true,
        source: "shadow",
      });
    });
    return c.json(await view(user, localeOf(c), now));
  });

  // Safe exit: nothing is recorded.
  app.post("/close", async (c) => {
    const user = c.get("user");
    const now = new Date();
    const draw = await openDraw(user, now);
    await db.update(shadowDraws).set({ status: "closed" }).where(eq(shadowDraws.id, draw.id));
    return c.json(await view(user, localeOf(c), now));
  });

  app.onError((err, c) => {
    if (err instanceof DrawError) return c.json({ ok: false, error: err.code }, 409);
    throw err;
  });

  return app;
}
