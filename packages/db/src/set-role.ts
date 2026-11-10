/**
 * Makes an account a psychologist (or back): `pnpm user:role you@example.com professional`.
 * Until the psychologist plan and checks exist (spec §20), this is how beta psychologists get access.
 */
import { eq } from "drizzle-orm";
import { createDb, users } from "./index";

const [email, role = "professional"] = process.argv.slice(2);
if (!email || (role !== "professional" && role !== "personal")) {
  console.error("usage: pnpm user:role <email> [professional|personal]");
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const db = createDb(url);
const rows = await db.update(users).set({ role }).where(eq(users.email, email.toLowerCase())).returning({ id: users.id });
console.log(rows.length ? `${email} is now ${role}` : `no account for ${email} (sign in once first)`);
process.exit(0);
