import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export * from "./schema";

export function createDb(url: string) {
  const pool = new pg.Pool({ connectionString: url });
  return drizzle(pool, { schema });
}
export type Db = ReturnType<typeof createDb>;
