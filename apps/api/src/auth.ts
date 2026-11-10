import { Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { assertTimeZone } from "@svity/core";
import { SignInInput, VerifyInput, type Me } from "@svity/contracts";
import { and, eq, gt, isNull, loginTokens, sessions, users, type Db } from "@svity/db";
import { hashToken, newToken } from "./crypto";
import type { Mailer } from "./mailer";
import { rateLimit } from "./rate-limit";

const LINK_TTL_MS = 15 * 60_000;
const SESSION_TTL_MS = 60 * 24 * 60 * 60_000; // 60 days
export const SESSION_COOKIE = "svity_session";

export type User = typeof users.$inferSelect;
export type AuthEnv = { Variables: { user: User } };

export function toMe(u: User): Me {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    locale: u.locale as Me["locale"],
    addressForm: u.addressForm,
    timezone: u.timezone,
    createdAt: u.createdAt.toISOString(),
  };
}

/** Puts the signed-in user on the context, or answers 401. */
export function requireUser(db: Db): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) return c.json({ ok: false, error: "unauthorized" }, 401);
    const [row] = await db
      .select({ user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (!row) return c.json({ ok: false, error: "unauthorized" }, 401);
    c.set("user", row.user);
    await next();
  };
}

export function authRoutes(db: Db, opts: { webOrigin: string; mailer: Mailer; secureCookies: boolean }) {
  const app = new Hono<AuthEnv>();
  // Each request sends an e-mail, so this one is strict; confirming a link is cheap.
  const emailLimit = rateLimit({ limit: 5, windowMs: 10 * 60_000 });
  const verifyLimit = rateLimit({ limit: 30, windowMs: 10 * 60_000 });

  // Always answers ok, so the response never reveals whether an account exists.
  app.post("/email", emailLimit, async (c) => {
    const parsed = SignInInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const email = parsed.data.email.toLowerCase();
    const token = newToken();
    await db.insert(loginTokens).values({ email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LINK_TTL_MS) });
    // The link opens a web page that confirms with a POST, so mail scanners that prefetch links can't use it up.
    const link = `${opts.webOrigin}/${parsed.data.locale}/signin/verify?token=${token}`;
    await opts.mailer.sendSignInLink(email, link, parsed.data.locale);
    return c.json({ ok: true });
  });

  app.post("/verify", verifyLimit, async (c) => {
    const parsed = VerifyInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    let timezone = parsed.data.timezone;
    try {
      assertTimeZone(timezone);
    } catch {
      timezone = "Europe/Kyiv";
    }
    const { locale } = parsed.data;

    const user = await db.transaction(async (tx) => {
      const [link] = await tx
        .update(loginTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(loginTokens.tokenHash, hashToken(parsed.data.token)),
            isNull(loginTokens.usedAt),
            gt(loginTokens.expiresAt, new Date()),
          ),
        )
        .returning();
      if (!link) return null;
      const [existing] = await tx.select().from(users).where(eq(users.email, link.email)).limit(1);
      if (existing) return existing;
      const [created] = await tx.insert(users).values({ email: link.email, locale, timezone }).returning();
      return created!;
    });
    if (!user) return c.json({ ok: false, error: "link_invalid" }, 400);

    const session = newToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.insert(sessions).values({ userId: user.id, tokenHash: hashToken(session), expiresAt });
    setCookie(c, SESSION_COOKIE, session, {
      httpOnly: true,
      secure: opts.secureCookies,
      sameSite: "Lax",
      path: "/",
      expires: expiresAt,
    });
    return c.json({ ok: true, me: toMe(user) });
  });

  app.post("/logout", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  return app;
}
