import { serve } from "@hono/node-server";
import { createDb } from "@svity/db";
import { createApp } from "./app";
import { consoleMailer } from "./mailer";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const app = createApp(createDb(databaseUrl), {
  webOrigin,
  mailer: consoleMailer,
  secureCookies: webOrigin.startsWith("https://"),
});
const port = Number(process.env.API_PORT ?? 4000);

serve({ fetch: app.fetch, port }, () => console.log(`api listening on :${port}`));
