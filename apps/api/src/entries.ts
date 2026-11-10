import { Hono } from "hono";
import { localDateKey, monthRange, toLocal } from "@svity/core";
import { EntryPatch, Feeling, type EntriesPage, type MonthView } from "@svity/contracts";
import { and, asc, desc, entries, eq, gte, lt, or, type Db } from "@svity/db";
import type { AuthEnv } from "./auth";
import { cardView, type Deck, type ImageSigner } from "./deck";
import { localeOf, type todayRoutes } from "./today";

const PAGE = 20;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

type EntryViewFn = ReturnType<typeof todayRoutes>["entryView"];

/** The diary (spec §7). Every query is scoped to the signed-in user. */
export function entryRoutes(db: Db, getDeck: () => Promise<Deck>, signer: ImageSigner, entryView: EntryViewFn) {
  const app = new Hono<AuthEnv>();
  const mine = (userId: string, id: string) => and(eq(entries.userId, userId), eq(entries.id, id));
  const isUuid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

  // Newest first; `?feeling=` matches the feeling before or after; `?favorite=1` only favourites.
  app.get("/", async (c) => {
    const user = c.get("user");
    const before = c.req.query("before");
    const f = Feeling.safeParse(c.req.query("feeling"));
    const rows = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, user.id),
          before && !Number.isNaN(Date.parse(before)) ? lt(entries.createdAt, new Date(before)) : undefined,
          f.success ? or(eq(entries.feelingBefore, f.data), eq(entries.feelingAfter, f.data)) : undefined,
          c.req.query("favorite") === "1" ? eq(entries.isFavorite, true) : undefined,
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

  // `?month=YYYY-MM` in the profile time zone; defaults to the current month.
  app.get("/month", async (c) => {
    const user = c.get("user");
    const tz = user.timezone;
    const now = toLocal(new Date(), tz);
    const m = MONTH.exec(c.req.query("month") ?? "");
    const year = m ? Number(m[1]) : now.year;
    const month = m ? Number(m[2]) : now.month;
    const { start, end } = monthRange(year, month, tz);

    const [rows, [older], [newer]] = await Promise.all([
      db
        .select()
        .from(entries)
        .where(and(eq(entries.userId, user.id), gte(entries.createdAt, start), lt(entries.createdAt, end)))
        .orderBy(asc(entries.createdAt)),
      db
        .select({ at: entries.createdAt })
        .from(entries)
        .where(and(eq(entries.userId, user.id), lt(entries.createdAt, start)))
        .orderBy(desc(entries.createdAt))
        .limit(1),
      db
        .select({ at: entries.createdAt })
        .from(entries)
        .where(and(eq(entries.userId, user.id), gte(entries.createdAt, end)))
        .orderBy(asc(entries.createdAt))
        .limit(1),
    ]);

    const deck = await getDeck();
    const locale = localeOf(c);
    // Later entries of the same day overwrite earlier ones: the mosaic shows the day's last card.
    const byDay = new Map<number, MonthView["days"][number]>();
    for (const e of rows) {
      byDay.set(toLocal(e.createdAt, tz).day, {
        day: toLocal(e.createdAt, tz).day,
        entryId: e.id,
        card: cardView(deck, signer, e.cardId, e.questionIndex, locale),
      });
    }
    const key = (d: Date | undefined) => (d ? localDateKey(d, tz).slice(0, 7) : null);
    return c.json<MonthView>({
      month: `${year}-${String(month).padStart(2, "0")}`,
      count: rows.length,
      days: [...byDay.values()],
      prev: key(older?.at),
      next: key(newer?.at),
    });
  });

  app.get("/:id", async (c) => {
    const id = c.req.param("id");
    if (!isUuid(id)) return c.json({ ok: false, error: "not_found" }, 404);
    const [row] = await db.select().from(entries).where(mine(c.get("user").id, id)).limit(1);
    if (!row) return c.json({ ok: false, error: "not_found" }, 404);
    return c.json(entryView(await getDeck(), row, localeOf(c)));
  });

  // Editing the note marks the entry "edited" (spec §7); the favourite toggle doesn't.
  app.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const parsed = EntryPatch.safeParse(await c.req.json().catch(() => null));
    if (!isUuid(id) || !parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const { note, isFavorite } = parsed.data;
    const [row] = await db
      .update(entries)
      .set({
        ...(note !== undefined ? { note: note || null, editedAt: new Date() } : {}),
        ...(isFavorite !== undefined ? { isFavorite } : {}),
      })
      .where(mine(c.get("user").id, id))
      .returning();
    if (!row) return c.json({ ok: false, error: "not_found" }, 404);
    return c.json(entryView(await getDeck(), row, localeOf(c)));
  });

  // The two-step confirmation lives in the UI; this deletes for good.
  app.delete("/:id", async (c) => {
    const id = c.req.param("id");
    if (!isUuid(id)) return c.json({ ok: false, error: "not_found" }, 404);
    const [row] = await db.delete(entries).where(mine(c.get("user").id, id)).returning({ id: entries.id });
    if (!row) return c.json({ ok: false, error: "not_found" }, 404);
    return c.json({ ok: true });
  });

  return app;
}
