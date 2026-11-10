import { Hono } from "hono";
import { deleteCookie } from "hono/cookie";
import { assertTimeZone, feelingStats } from "@svity/core";
import { ProfilePatch, type Feeling, type ProfileStats } from "@svity/contracts";
import { asc, entries, eq, users, type Db } from "@svity/db";
import { SESSION_COOKIE, toMe, type AuthEnv } from "./auth";
import type { Deck } from "./deck";
import { shadowState } from "./shadow";
import en from "@svity/i18n/messages/en.json" with { type: "json" };
import uk from "@svity/i18n/messages/uk.json" with { type: "json" };

const FEELINGS: Record<string, Record<string, string>> = { en: en.feelings, uk: uk.feelings };

/** Profile, stats, diary export and account deletion. */
export function meRoutes(db: Db, getDeck: () => Promise<Deck>) {
  const app = new Hono<AuthEnv>();

  app.get("/", (c) => c.json({ ok: true, me: toMe(c.get("user")) }));

  app.patch("/", async (c) => {
    const parsed = ProfilePatch.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    if (parsed.data.timezone) {
      try {
        assertTimeZone(parsed.data.timezone);
      } catch {
        return c.json({ ok: false, error: "invalid_timezone" }, 400);
      }
    }
    // A new time zone applies from the next draw; today's timer was already fixed at the first flip.
    const [user] = await db.update(users).set(parsed.data).where(eq(users.id, c.get("user").id)).returning();
    return c.json({ ok: true, me: toMe(user!) });
  });

  app.get("/stats", async (c) => {
    const user = c.get("user");
    const rows = await db
      .select({ at: entries.createdAt, before: entries.feelingBefore, after: entries.feelingAfter })
      .from(entries)
      .where(eq(entries.userId, user.id));
    const stats = feelingStats(rows);
    const { progress, softStop } = await shadowState(db, user);
    return c.json<ProfileStats>({
      entries: stats.total,
      lighter: stats.lighter,
      topAfter: stats.topAfter as { feeling: Feeling; count: number }[],
      shadow: { ...progress, consented: user.shadowConsentAt !== null, mode: user.shadowMode, softStop },
    });
  });

  // The diary as plain text (spec §7 "экспорт дневника текстом"), in the account language.
  app.get("/export", async (c) => {
    const user = c.get("user");
    const deck = await getDeck();
    const locale = user.locale;
    const rows = await db.select().from(entries).where(eq(entries.userId, user.id)).orderBy(asc(entries.createdAt));
    const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: user.timezone });
    const lines = rows.map((e) => {
      const q = deck.byId.get(e.cardId)?.questions.find((x) => x.index === e.questionIndex)?.text[locale] ?? "";
      return [
        `${date.format(e.createdAt)} · #${e.cardId}${e.isShadow ? (locale === "uk" ? " · тіньова карта" : " · shadow card") : ""}`,
        q && `? ${q}`,
        e.requestText && `» ${e.requestText}`,
        `${FEELINGS[locale]?.[e.feelingBefore] ?? e.feelingBefore} → ${FEELINGS[locale]?.[e.feelingAfter] ?? e.feelingAfter}`,
        e.note ?? "",
      ]
        .filter(Boolean)
        .join("\n");
    });
    const body = [`Svity · ${user.email}`, "", ...lines.flatMap((l) => [l, "", "———", ""])].join("\n");
    return c.body(body, 200, {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="svity-diary.txt"`,
      "cache-control": "no-store",
    });
  });

  // Deletes the account and everything in it (cascades). The UI asks twice; the body must confirm.
  app.delete("/", async (c) => {
    const body = (await c.req.json().catch(() => null)) as { confirm?: string } | null;
    if (body?.confirm !== "delete") return c.json({ ok: false, error: "confirm_required" }, 400);
    await db.delete(users).where(eq(users.id, c.get("user").id));
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  return app;
}
