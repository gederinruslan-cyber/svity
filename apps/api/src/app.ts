import { Hono } from "hono";
import { cors } from "hono/cors";
import { BetaApplicationInput, WaitlistInput, type SubmitResult } from "@svity/contracts";
import { betaApplications, waitlistEntries, type Db } from "@svity/db";
import { authRoutes, requireUser, type AuthEnv } from "./auth";
import { cardImageRoutes, deckLoader, imageSigner } from "./deck";
import type { Mailer } from "./mailer";
import { entryRoutes } from "./entries";
import { meRoutes } from "./me";
import { roomRoutes } from "./rooms";
import { shadowRoutes } from "./shadow";
import { todayRoutes } from "./today";
import { rateLimit } from "./rate-limit";

export interface AppOptions {
  webOrigin: string;
  mailer: Mailer;
  secureCookies: boolean;
  /** Public origin of this API, used in signed card-image URLs. */
  publicUrl: string;
  imageSecret: string;
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
  const getDeck = deckLoader(db);
  app.use("/v1/me", requireUser(db));
  app.use("/v1/me/*", requireUser(db));
  app.route("/v1/me", meRoutes(db, getDeck));
  const signer = imageSigner({ secret: opts.imageSecret, publicUrl: opts.publicUrl });
  const today = todayRoutes(db, getDeck, signer);
  app.use("/v1/today/*", requireUser(db));
  app.use("/v1/today", requireUser(db));
  app.use("/v1/entries/*", requireUser(db));
  app.use("/v1/entries", requireUser(db));
  app.route("/v1/today", today.app);
  app.route("/v1/entries", entryRoutes(db, getDeck, signer, today.entryView));
  app.use("/v1/shadow/*", requireUser(db));
  app.use("/v1/shadow", requireUser(db));
  app.route("/v1/shadow", shadowRoutes(db, getDeck, signer, today.entryView));
  app.route("/v1/cards", cardImageRoutes(getDeck, signer));
  const roomApi = roomRoutes(db, getDeck, signer, opts);
  app.route("/v1/rooms", roomApi.pro);
  app.route("/v1/r", roomApi.client);
  app.route("/v1/sessions", roomApi.sessions);

  app.onError((err, c) => {
    console.error(err);
    return c.json<SubmitResult>({ ok: false, error: "server" }, 500);
  });

  return app;
}
