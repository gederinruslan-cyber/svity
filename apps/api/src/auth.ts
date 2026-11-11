import { Hono, type Context, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { assertTimeZone } from "@svity/core";
import { ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput, SignInInput, SignUpInput, type Me } from "@svity/contracts";
import { and, betaApplications, eq, gt, isNull, ne, passwordResets, sessions, users, type Db } from "@svity/db";
import { hashToken, newToken } from "./crypto";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { passwordResetEmail, type Mailer } from "./mailer";
import { rateLimit } from "./rate-limit";

const RESET_TTL_MS = 30 * 60_000;
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
    displayName: u.displayName,
    isAdmin: u.isAdmin,
    reminderTime: u.reminderTime as Me["reminderTime"],
    createdAt: u.createdAt.toISOString(),
  };
}

/** The signed-in user, or null. */
export async function findUser(db: Db, c: Context): Promise<User | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row?.user ?? null;
}

/** Puts the signed-in user on the context, or answers 401. */
export function requireUser(db: Db): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const user = await findUser(db, c);
    if (!user) return c.json({ ok: false, error: "unauthorized" }, 401);
    c.set("user", user);
    await next();
  };
}

/** Psychologist-only routes (role "professional"). */
export function requirePro(db: Db): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const user = await findUser(db, c);
    if (!user) return c.json({ ok: false, error: "unauthorized" }, 401);
    if (user.role !== "professional") return c.json({ ok: false, error: "forbidden" }, 403);
    c.set("user", user);
    await next();
  };
}

/** Failed sign-ins per e-mail: guessing one account from many IPs still hits a wall. In memory, like rate-limit.ts. */
function failureCounter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const fails = new Map<string, { count: number; resetAt: number }>();
  return {
    locked(key: string) {
      const f = fails.get(key);
      return !!f && f.resetAt > Date.now() && f.count >= limit;
    },
    fail(key: string) {
      const f = fails.get(key);
      if (!f || f.resetAt <= Date.now()) fails.set(key, { count: 1, resetAt: Date.now() + windowMs });
      else f.count++;
    },
    clear(key: string) {
      fails.delete(key);
    },
  };
}

export function authRoutes(db: Db, opts: { webOrigin: string; mailer: Mailer; secureCookies: boolean }) {
  const app = new Hono<AuthEnv>();
  const signUpLimit = rateLimit({ limit: 10, windowMs: 10 * 60_000 });
  const signInLimit = rateLimit({ limit: 30, windowMs: 10 * 60_000 });
  const forgotLimit = rateLimit({ limit: 5, windowMs: 10 * 60_000 });
  const resetLimit = rateLimit({ limit: 30, windowMs: 10 * 60_000 });
  const perAccount = failureCounter({ limit: 10, windowMs: 15 * 60_000 });

  async function startSession(c: Context, userId: string) {
    const token = newToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
    setCookie(c, SESSION_COOKIE, token, { httpOnly: true, secure: opts.secureCookies, sameSite: "Lax", path: "/", expires: expiresAt });
  }

  app.post("/signup", signUpLimit, async (c) => {
    const parsed = SignUpInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const { password, locale } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    let timezone = parsed.data.timezone;
    try {
      assertTimeZone(timezone);
    } catch {
      timezone = "Europe/Kyiv";
    }
    const passwordHash = await hashPassword(password);
    // An approved beta application for this e-mail makes the new account a psychologist.
    const [approved] = await db
      .select({ id: betaApplications.id })
      .from(betaApplications)
      .where(and(eq(betaApplications.email, email), eq(betaApplications.status, "approved")));
    const role = approved ? "professional" : "personal";
    const [user] = await db.insert(users).values({ email, passwordHash, locale, timezone, role }).onConflictDoNothing().returning();
    if (!user) return c.json({ ok: false, error: "email_taken" }, 409);
    await startSession(c, user.id);
    return c.json({ ok: true, me: toMe(user) }, 201);
  });

  // One answer for "no such account" and "wrong password", and the same work for both.
  app.post("/signin", signInLimit, async (c) => {
    const parsed = SignInInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const email = parsed.data.email.toLowerCase();
    if (perAccount.locked(email)) return c.json({ ok: false, error: "rate_limited" }, 429);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !ok) {
      perAccount.fail(email);
      return c.json({ ok: false, error: "invalid_credentials" }, 401);
    }
    perAccount.clear(email);
    await startSession(c, user.id);
    return c.json({ ok: true, me: toMe(user) });
  });

  // Always answers ok, so it never reveals whether an account exists.
  app.post("/forgot", forgotLimit, async (c) => {
    const parsed = ForgotPasswordInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const email = parsed.data.email.toLowerCase();
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      const token = newToken();
      await db.insert(passwordResets).values({ userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TTL_MS) });
      // The page asks for the new password and POSTs the token: prefetching the link does nothing.
      const link = `${opts.webOrigin}/${parsed.data.locale}/reset-password?token=${token}`;
      // A mail outage must not reveal whether the account exists, so failures are logged, not returned.
      await opts.mailer.send(passwordResetEmail(email, link, parsed.data.locale)).catch((err) => console.error("reset e-mail failed", err));
    }
    return c.json({ ok: true });
  });

  // A new password signs out every other device.
  app.post("/reset", resetLimit, async (c) => {
    const parsed = ResetPasswordInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await db.transaction(async (tx) => {
      const [reset] = await tx
        .update(passwordResets)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResets.tokenHash, hashToken(parsed.data.token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date())))
        .returning();
      if (!reset) return null;
      const [u] = await tx.update(users).set({ passwordHash }).where(eq(users.id, reset.userId)).returning();
      await tx.delete(sessions).where(eq(sessions.userId, reset.userId));
      return u ?? null;
    });
    if (!user) return c.json({ ok: false, error: "link_invalid" }, 400);
    perAccount.clear(user.email);
    await startSession(c, user.id);
    return c.json({ ok: true, me: toMe(user) });
  });

  // Signed in: needs the current password; other devices are signed out, this one stays.
  app.post("/password", requireUser(db), signInLimit, async (c) => {
    const parsed = ChangePasswordInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const user = c.get("user");
    if (!user.passwordHash || !(await verifyPassword(parsed.data.current, user.passwordHash))) {
      return c.json({ ok: false, error: "invalid_credentials" }, 401);
    }
    await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, user.id));
    const current = hashToken(getCookie(c, SESSION_COOKIE) ?? "");
    await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, current)));
    return c.json({ ok: true });
  });

  app.post("/logout", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  return app;
}

export function requireAdmin(db: Db): MiddlewareHandler<AuthEnv> {
  return async (c, next) => {
    const user = await findUser(db, c);
    if (!user) return c.json({ ok: false, error: "unauthorized" }, 401);
    if (!user.isAdmin) return c.json({ ok: false, error: "forbidden" }, 403);
    c.set("user", user);
    await next();
  };
}
