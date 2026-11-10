import type { MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";

/** Fixed-window, in-memory limiter. Enough for one instance; move to Postgres/Redis when we scale out. */
export function rateLimit({ limit, windowMs }: { limit: number; windowMs: number }): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? getConnInfo(c).remote.address ?? "unknown";
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (++entry.count > limit) {
      return c.json({ ok: false, error: "rate_limited" }, 429);
    }
    await next();
  };
}
