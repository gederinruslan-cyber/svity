import { Hono } from "hono";
import { cors } from "hono/cors";
import { BetaApplicationInput, WaitlistInput, type SubmitResult } from "@svity/contracts";
import { betaApplications, waitlistEntries, type Db } from "@svity/db";
import { authRoutes, requireUser, toMe, type AuthEnv } from "./auth";
import type { Mailer } from "./mailer";
import { rateLimit } from "./rate-limit";

export interface AppOptions {
  webOrigin: string;
  mailer: Mailer;
  secureCookies: boolean;
}

export function createApp(db: Db, opts: AppOptions) {
  const app = new Hono<AuthEnv>();
  const { webOrigin } = opts;

  app.use("/v1/*", cors({ origin: webOrigin, credentials: true }));
  app.get("/health", (c) => c.json({ ok: true }));

  const forms = rateLimit({ limit: 10, windowMs: 10 * 60_000 });

  // Duplicates and honeypot hits both answer ok, so the response reveals nothing.
  app.post("/v1/waitlist", forms, async (c) => {
    const parsed = WaitlistInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json<SubmitResult>({ ok: false, error: "invalid" }, 400);
    const { email, locale, website } = parsed.data;
    if (!website) {
      await db.insert(waitlistEntries).values({ email: email.toLowerCase(), locale }).onConflictDoNothing();
    }
    return c.json<SubmitResult>({ ok: true });
  });

  app.post("/v1/beta-applications", forms, async (c) => {
    const parsed = BetaApplicationInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json<SubmitResult>({ ok: false, error: "invalid" }, 400);
    const { website, email, ...rest } = parsed.data;
    if (!website) {
      await db.insert(betaApplications).values({ ...rest, email: email.toLowerCase() }).onConflictDoNothing();
    }
    return c.json<SubmitResult>({ ok: true });
  });

  app.route("/v1/auth", authRoutes(db, opts));
  app.get("/v1/me", requireUser(db), (c) => c.json({ ok: true, me: toMe(c.get("user")) }));

  app.onError((err, c) => {
    console.error(err);
    return c.json<SubmitResult>({ ok: false, error: "server" }, 500);
  });

  return app;
}
