import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { createDb } from "@svity/db";
import { purgeOldRooms } from "./rooms";
import { createApp } from "./app";
import { randomBytes } from "node:crypto";
import { consoleMailer } from "./mailer";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const db = createDb(databaseUrl);
const app = createApp(db, {
  webOrigin,
  mailer: consoleMailer,
  secureCookies: webOrigin.startsWith("https://"),
  publicUrl: process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.API_PORT ?? 4000}`,
  // Without a configured secret, image links simply stop working after a restart.
  imageSecret: process.env.CARD_IMAGE_SECRET ?? randomBytes(32).toString("base64url"),
});
const port = Number(process.env.API_PORT ?? 4000);

// Rooms push live snapshots over WebSocket (spec §17 RoomEvent).
serve({ fetch: app.fetch, port, websocket: { server: new WebSocketServer({ noServer: true }) } }, () =>
  console.log(`api listening on :${port}`),
);

const purge = () => purgeOldRooms(db).catch((err) => console.error("room purge failed", err));
void purge();
setInterval(purge, 60 * 60_000).unref();
