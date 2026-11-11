import { Hono } from "hono";
import { ApplicationDecision, type AdminApplication } from "@svity/contracts";
import { betaApplications, desc, eq, users, type Db } from "@svity/db";
import type { AuthEnv } from "./auth";
import { betaApprovedEmail, type Mailer } from "./mailer";

/**
 * The Svity team's page: beta applications from psychologists. Approving makes the account with
 * that e-mail a psychologist, now or when it signs up; rejecting or revoking makes it personal again.
 */
export function adminRoutes(db: Db, opts: { mailer: Mailer; webOrigin: string }) {
  const app = new Hono<AuthEnv>();

  app.get("/applications", async (c) => {
    const rows = await db
      .select({ a: betaApplications, role: users.role })
      .from(betaApplications)
      .leftJoin(users, eq(users.email, betaApplications.email))
      .orderBy(desc(betaApplications.createdAt));
    return c.json(
      rows.map(({ a, role }): AdminApplication => ({
        id: a.id,
        name: a.name,
        email: a.email,
        specialization: a.specialization as AdminApplication["specialization"],
        country: a.country,
        usesCards: a.usesCards,
        message: a.message,
        locale: a.locale as AdminApplication["locale"],
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        decidedAt: a.decidedAt?.toISOString() ?? null,
        account: role ? { role } : null,
      })),
    );
  });

  app.post("/applications/:id", async (c) => {
    const parsed = ApplicationDecision.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const { status } = parsed.data;
    const admin = c.get("user");
    const [a] = await db.select().from(betaApplications).where(eq(betaApplications.id, c.req.param("id")));
    if (!a) return c.json({ ok: false, error: "not_found" }, 404);
    if (a.status === status) return c.json({ ok: true });

    await db.update(betaApplications).set({ status, decidedAt: new Date(), decidedBy: admin.id }).where(eq(betaApplications.id, a.id));
    const role = status === "approved" ? "professional" : "personal";
    const [account] = await db.update(users).set({ role }).where(eq(users.email, a.email)).returning({ id: users.id });

    if (status === "approved") {
      const path = account ? "cabinet" : "signup";
      await opts.mailer
        .send(betaApprovedEmail(a.email, `${opts.webOrigin}/${a.locale}/${path}`, a.locale as "uk" | "en", !!account))
        .catch((err) => console.error("beta approval e-mail failed", err));
    }
    return c.json({ ok: true });
  });

  return app;
}

