/**
 * Gives an account the Svity team's /admin page (or takes it away):
 * `pnpm user:admin you@example.com` or `pnpm user:admin you@example.com off`.
 */
import { eq } from "drizzle-orm";
import { createDb, users } from "./index";

const [email, flag = "on"] = process.argv.slice(2);
if (!email || (flag !== "on" && flag !== "off")) {
  console.error("usage: pnpm user:admin <email> [on|off]");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const db = createDb(url);
const rows = await db.update(users).set({ isAdmin: flag === "on" }).where(eq(users.email, email.toLowerCase())).returning({ id: users.id });
console.log(rows.length ? `${email}: admin ${flag}` : `no account for ${email} (sign up first)`);
process.exit(0);
