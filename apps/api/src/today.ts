import { Hono, type Context } from "hono";
import {
  DrawError,
  canDraw,
  closeDraw,
  currentCard,
  eligibleCards,
  pickQuestion,
  repick,
  saveDraw,
  startDraw,
  type DailyDraw,
} from "@svity/core";
import {
  DrawInput,
  Feeling,
  Locale,
  SaveInput,
  type EntriesPage,
  type EntryView,
  type TodayView,
} from "@svity/contracts";
import { and, dailyDraws, desc, eq, entries, lt, or, sql, type Db } from "@svity/db";
import type { AuthEnv, User } from "./auth";
import { cardView, type Deck, type ImageSigner } from "./deck";

type DrawRow = typeof dailyDraws.$inferSelect;
type EntryRow = typeof entries.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const toCore = (r: DrawRow): DailyDraw => ({
  firstFlipAt: r.firstFlipAt,
  nextAvailableAt: r.nextAvailableAt,
  cardsSeen: r.cardsSeen,
  repicksLeft: r.repicksLeft,
  status: r.status,
});

/** Request-language override (`?locale=`), else the account language. */
function localeOf(c: Context<AuthEnv>): Locale {
  const q = Locale.safeParse(c.req.query("locale"));
  return q.success ? q.data : (c.get("user").locale as Locale);
}

export function todayRoutes(db: Db, getDeck: () => Promise<Deck>, signer: ImageSigner) {
  const app = new Hono<AuthEnv>();

  const latestDraw = async (tx: Db | Tx, userId: string) =>
    (await tx.select().from(dailyDraws).where(eq(dailyDraws.userId, userId)).orderBy(desc(dailyDraws.firstFlipAt)).limit(1))[0] ??
    null;

  const entryView = (deck: Deck, e: EntryRow, locale: Locale): EntryView => ({
    id: e.id,
    card: cardView(deck, signer, e.cardId, e.questionIndex, locale),
    request: e.requestText,
    feelingBefore: e.feelingBefore as Feeling,
    feelingAfter: e.feelingAfter as Feeling,
    note: e.note,
    isShadow: e.isShadow,
    isFavorite: e.isFavorite,
    createdAt: e.createdAt.toISOString(),
    editedAt: e.editedAt?.toISOString() ?? null,
  });

  async function view(tx: Db | Tx, user: User, locale: Locale, now = new Date()): Promise<TodayView> {
    const deck = await getDeck();
    const last = await latestDraw(tx, user.id);
    if (!last || canDraw(toCore(last), now).ok) return { state: "ready" };
    if (last.status === "open") {
      return {
        state: "open",
        card: cardView(deck, signer, currentCard(toCore(last)), last.questionIndex, locale),
        repicksLeft: last.repicksLeft,
        feelingBefore: last.feelingBefore as Feeling,
        request: last.requestText,
        nextAvailableAt: last.nextAvailableAt.toISOString(),
      };
    }
    const [entry] = await tx.select().from(entries).where(eq(entries.drawId, last.id)).limit(1);
    return {
      state: "done",
      nextAvailableAt: last.nextAvailableAt.toISOString(),
      entry: entry ? entryView(deck, entry, locale) : null,
    };
  }

  /** Runs `fn` with the user's draws locked, so double taps and two devices can't both draw. */
  function locked<T>(userId: string, fn: (tx: Tx) => Promise<T>) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
      return fn(tx);
    });
  }

  /** The open draw of the current period, or a DrawError. */
  async function openDraw(tx: Tx, userId: string, now: Date) {
    const last = await latestDraw(tx, userId);
    if (!last || last.status !== "open" || now >= last.nextAvailableAt) throw new DrawError("not-open");
    return last;
  }

  const question = (deck: Deck, cardId: number, request: string | null) =>
    pickQuestion(deck.byId.get(cardId)!.questions, { hasRequest: !!request, allowShadow: false });

  app.get("/", async (c) => c.json(await view(db, c.get("user"), localeOf(c))));

  app.post("/draw", async (c) => {
    const parsed = DrawInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const user = c.get("user");
    const now = new Date();
    const request = parsed.data.request || null;
    await locked(user.id, async (tx) => {
      const deck = await getDeck();
      const last = await latestDraw(tx, user.id);
      // Shadow cards join the daily draw only via shadow access (M2).
      const draw = startDraw(last && toCore(last), eligibleCards(deck.playable, { includeShadow: false }), {
        now,
        tz: user.timezone,
      });
      const card = currentCard(draw);
      await tx.insert(dailyDraws).values({
        userId: user.id,
        ...draw,
        questionIndex: question(deck, card, request),
        feelingBefore: parsed.data.feelingBefore,
        requestText: request,
      });
    });
    return c.json(await view(db, user, localeOf(c), now));
  });

  app.post("/repick", async (c) => {
    const user = c.get("user");
    const now = new Date();
    await locked(user.id, async (tx) => {
      const deck = await getDeck();
      const row = await openDraw(tx, user.id, now);
      const next = repick(toCore(row), eligibleCards(deck.playable, { includeShadow: false }));
      await tx
        .update(dailyDraws)
        .set({
          cardsSeen: next.cardsSeen,
          repicksLeft: next.repicksLeft,
          questionIndex: question(deck, currentCard(next), row.requestText),
        })
        .where(eq(dailyDraws.id, row.id));
    });
    return c.json(await view(db, user, localeOf(c), now));
  });

  app.post("/save", async (c) => {
    const parsed = SaveInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const user = c.get("user");
    const now = new Date();
    await locked(user.id, async (tx) => {
      const row = await openDraw(tx, user.id, now);
      const saved = saveDraw(toCore(row));
      await tx.update(dailyDraws).set({ status: saved.status }).where(eq(dailyDraws.id, row.id));
      await tx.insert(entries).values({
        userId: user.id,
        drawId: row.id,
        cardId: currentCard(saved),
        questionIndex: row.questionIndex,
        requestText: row.requestText,
        feelingBefore: row.feelingBefore,
        feelingAfter: parsed.data.feelingAfter,
        note: parsed.data.note || null,
      });
    });
    return c.json(await view(db, user, localeOf(c), now));
  });

  // "Close without saving": nothing is recorded, and today's card counts as used.
  app.post("/close", async (c) => {
    const user = c.get("user");
    const now = new Date();
    await locked(user.id, async (tx) => {
      const row = await openDraw(tx, user.id, now);
      await tx.update(dailyDraws).set({ status: closeDraw(toCore(row)).status }).where(eq(dailyDraws.id, row.id));
    });
    return c.json(await view(db, user, localeOf(c), now));
  });

  app.onError((err, c) => {
    if (err instanceof DrawError) {
      return c.json({ ok: false, error: err.code, nextAvailableAt: err.nextAvailableAt?.toISOString() }, 409);
    }
    throw err;
  });

  return { app, entryView };
}

const PAGE = 20;

export function entryRoutes(db: Db, getDeck: () => Promise<Deck>, entryView: ReturnType<typeof todayRoutes>["entryView"]) {
  const app = new Hono<AuthEnv>();

  // Newest first; `?feeling=` matches the feeling before or after (spec §7).
  app.get("/", async (c) => {
    const user = c.get("user");
    const before = c.req.query("before");
    const f = Feeling.safeParse(c.req.query("feeling"));
    const feeling = f.success ? f.data : undefined;
    const rows = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, user.id),
          before ? lt(entries.createdAt, new Date(before)) : undefined,
          feeling ? or(eq(entries.feelingBefore, feeling), eq(entries.feelingAfter, feeling)) : undefined,
        ),
      )
      .orderBy(desc(entries.createdAt))
      .limit(PAGE + 1);
    const deck = await getDeck();
    const page = rows.slice(0, PAGE);
    return c.json<EntriesPage>({
      entries: page.map((e) => entryView(deck, e, localeOf(c))),
      next: rows.length > PAGE ? page.at(-1)!.createdAt.toISOString() : null,
    });
  });

  return app;
}
