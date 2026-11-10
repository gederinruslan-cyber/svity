import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export * from "./schema";

export function createDb(url: string) {
  const pool = new pg.Pool({ connectionString: url });
  return drizzle(pool, { schema });
}
export type Db = ReturnType<typeof createDb>;

// Query helpers, re-exported so apps use the same drizzle-orm instance.
export { and, asc, count, desc, eq, gt, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
