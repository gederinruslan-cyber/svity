import { randomInt } from "node:crypto";
import { Hono, type Context, type MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { upgradeWebSocket } from "@hono/node-server";
import {
  ROOM_RULES,
  RoomError,
  SPREAD_POSITIONS,
  confirmCard,
  drawCard,
  faceUpChoices,
  nextPosition,
  psychologistState,
  replay,
  returnCard,
  seededRng,
  weekQuestionAllowed,
  type RoomEvent,
  type RoomSettings,
  type RoomState,
} from "@svity/core";
import {
  RoomConfirmInput,
  RoomCreateInput,
  RoomDrawInput,
  RoomJoinInput,
  RoomNotesInput,
  RoomSummaryInput,
  type ClientRoomView,
  type Locale,
  type PsychologistRoomView,
  type RoomCard,
  type RoomCreated,
  type RoomListItem,
  type RoomLobby,
  type SessionSummaryView,
} from "@svity/contracts";
import { and, asc, desc, eq, lt, roomEvents, rooms, sessionNotes, sessionSummaries, sql, users, type Db } from "@svity/db";
import { findUser, requirePro, requireUser, type AuthEnv } from "./auth";
import { hashToken, newToken } from "./crypto";
import type { Deck, ImageSigner } from "./deck";
import { rateLimit } from "./rate-limit";

type Room = typeof rooms.$inferSelect;
type SummaryRow = typeof sessionSummaries.$inferSelect;
type Role = "client" | "psychologist";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const newCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
/** Accepts "7KQ-29F", "7kq29f". */
const normalizeCode = (raw: string) => raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
const pinHash = (roomId: string, pin: string) => hashToken(`${roomId}:${pin}`);
const clientCookie = (code: string) => `svity_room_${code}`;

const settingsOf = (r: Room): RoomSettings => ({
  spread: r.spread === 1 ? 1 : 3,
  choiceMode: r.choiceMode,
  includeShadow: r.includeShadow,
  showReturns: r.showReturns,
});

const toCoreEvent = (e: typeof roomEvents.$inferSelect): RoomEvent => ({
  type: e.type,
  cardId: e.cardId,
  position: e.position,
  method: e.method,
  at: e.at,
});

/** Live connections per room. One API instance for now; move to Postgres LISTEN/NOTIFY when we scale out. */
const hub = new Map<string, Set<{ role: Role; send: (data: string) => void }>>();
const online = (roomId: string, role: Role) => [...(hub.get(roomId) ?? [])].some((c) => c.role === role);

/** Deletes rooms (events, notes) after 30 days (spec §4). Summaries in clients' diaries stay. */
export async function purgeOldRooms(db: Db, now = new Date()) {
  const cutoff = new Date(now.getTime() - ROOM_RULES.keepDays * 864e5);
  await db.delete(rooms).where(lt(rooms.createdAt, cutoff));
}

export function roomRoutes(db: Db, getDeck: () => Promise<Deck>, signer: ImageSigner, opts: { webOrigin: string; secureCookies: boolean }) {
  const card = (id: number): RoomCard => ({ id, imageUrl: signer.url(id) });

  async function load(roomId: string) {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return null;
    const events = (await db.select().from(roomEvents).where(eq(roomEvents.roomId, roomId)).orderBy(asc(roomEvents.at))).map(toCoreEvent);
    return { room, state: replay(settingsOf(room), events) };
  }

  async function summaryView(row: SummaryRow): Promise<SessionSummaryView> {
    const deck = await getDeck();
    const q =
      row.weekCardId != null
        ? deck.byId.get(row.weekCardId)?.questions.find((x) => x.index === row.weekQuestionIndex)?.text[row.language]
        : undefined;
    return {
      id: row.id,
      psychologistName: row.psychologistName,
      cards: row.cards.map((x) => ({ position: x.position, card: card(x.cardId) })),
      weekQuestion: q ?? null,
      sentAt: row.sentAt.toISOString(),
    };
  }

  const summaryOf = async (roomId: string) => {
    const [row] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.roomId, roomId));
    return row ? summaryView(row) : null;
  };

  const psychologistName = async (room: Room) =>
    (await db.select({ n: users.displayName }).from(users).where(eq(users.id, room.psychologistId)))[0]?.n ?? null;

  async function clientView(room: Room, state: RoomState): Promise<ClientRoomView> {
    const deck = await getDeck();
    const settings = settingsOf(room);
    const current = nextPosition(state);
    // Stable for one position and one return count, so updates don't reshuffle the open cards.
    const choices =
      settings.choiceMode === "up" && current !== null && !state.held && !state.ended
        ? faceUpChoices(state, settings, deck.playable, seededRng(`${room.id}:${current}:${state.returns}`)).map(card)
        : [];
    return {
      role: "client",
      code: room.code,
      psychologistName: await psychologistName(room),
      positions: [...SPREAD_POSITIONS[settings.spread]],
      choiceMode: settings.choiceMode,
      current,
      held: state.held ? card(state.held.cardId) : null,
      confirmed: state.confirmed.map((id) => (id === null ? null : card(id))),
      choices,
      pauseAt: state.pauseAt?.toISOString() ?? null,
      psychologistOnline: online(room.id, "psychologist"),
      videoUrl: room.videoUrl,
      showReturns: room.showReturns,
      ended: state.ended,
      summary: state.ended ? await summaryOf(room.id) : null,
    };
  }

  async function psychologistView(room: Room, state: RoomState): Promise<PsychologistRoomView> {
    const deck = await getDeck();
    const settings = settingsOf(room);
    const visible = psychologistState(state, settings);
    const lang = room.questionLanguage as Locale;
    const [notes] = await db.select().from(sessionNotes).where(eq(sessionNotes.roomId, room.id));
    return {
      role: "psychologist",
      id: room.id,
      code: room.code,
      clientLabel: room.clientLabel,
      positions: [...SPREAD_POSITIONS[settings.spread]],
      choiceMode: settings.choiceMode,
      includeShadow: room.includeShadow,
      questionLanguage: lang,
      expiresAt: room.expiresAt.toISOString(),
      pinRequired: room.pinHash !== null,
      videoUrl: room.videoUrl,
      clientJoined: visible.joined,
      clientOnline: online(room.id, "client"),
      confirmed: visible.confirmed.map((id) =>
        id === null
          ? null
          : { ...card(id), questions: (deck.byId.get(id)?.questions ?? []).map((q) => ({ index: q.index, text: q.text[lang] ?? q.text.en ?? "" })) },
      ),
      returns: visible.returns,
      pauseAt: state.pauseAt?.toISOString() ?? null,
      notes: notes?.text ?? "",
      ended: visible.ended,
      summary: visible.ended ? await summaryOf(room.id) : null,
    };
  }

  /** Each side gets its own snapshot; the psychologist's never contains the held or returned cards. */
  async function broadcast(roomId: string) {
    const conns = hub.get(roomId);
    if (!conns?.size) return;
    const loaded = await load(roomId);
    if (!loaded) return;
    const views: Partial<Record<Role, string>> = {};
    for (const conn of conns) {
      views[conn.role] ??= JSON.stringify(
        conn.role === "client" ? await clientView(loaded.room, loaded.state) : await psychologistView(loaded.room, loaded.state),
      );
      conn.send(views[conn.role]!);
    }
  }

  /** Writes one event with the room locked, so double taps can't draw twice. */
  async function act(roomId: string, step: (room: Room, state: RoomState) => Promise<RoomEvent> | RoomEvent) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${roomId}))`);
      const [room] = await tx.select().from(rooms).where(eq(rooms.id, roomId));
      if (!room) throw new RoomError("ended");
      const events = (await tx.select().from(roomEvents).where(eq(roomEvents.roomId, roomId)).orderBy(asc(roomEvents.at))).map(toCoreEvent);
      const e = await step(room, replay(settingsOf(room), events));
      await tx.insert(roomEvents).values({ roomId, type: e.type, cardId: e.cardId ?? null, position: e.position ?? null, method: e.method ?? null, at: e.at });
    });
    await broadcast(roomId);
  }

  /** WebSocket upgrades must come from our web app (cookies ride along on cross-site upgrades otherwise). */
  const sameOrigin: MiddlewareHandler = async (c, next) => {
    if (c.req.header("origin") !== opts.webOrigin) return c.body(null, 403);
    await next();
  };

  const live = (role: Role, roomId: (c: Context) => string) =>
    upgradeWebSocket((c) => {
      const id = roomId(c);
      const conn = { role, send: (_: string) => {} };
      return {
        onOpen(_evt, ws) {
          conn.send = (data) => ws.send(data);
          if (!hub.has(id)) hub.set(id, new Set());
          hub.get(id)!.add(conn);
          void broadcast(id);
        },
        onClose() {
          hub.get(id)?.delete(conn);
          if (!hub.get(id)?.size) hub.delete(id);
          void broadcast(id);
        },
      };
    });

  // ---------- psychologist ----------
  type ProEnv = AuthEnv & { Variables: { room: Room } };
  const pro = new Hono<ProEnv>();
  pro.use("*", requirePro(db));

  const ownRoom: MiddlewareHandler<ProEnv> = async (c, next) => {
    const id = c.req.param("id") ?? "";
    if (!/^[0-9a-f-]{36}$/.test(id)) return c.json({ ok: false, error: "not_found" }, 404);
    const [room] = await db.select().from(rooms).where(and(eq(rooms.id, id), eq(rooms.psychologistId, c.get("user").id)));
    if (!room) return c.json({ ok: false, error: "not_found" }, 404);
    c.set("room", room);
    await next();
  };

  pro.get("/", async (c) => {
    const now = new Date();
    const rows = await db.select().from(rooms).where(eq(rooms.psychologistId, c.get("user").id)).orderBy(desc(rooms.createdAt)).limit(50);
    return c.json<RoomListItem[]>(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        clientLabel: r.clientLabel,
        spread: r.spread === 1 ? 1 : 3,
        status: r.endedAt ? "ended" : now >= r.expiresAt ? "expired" : r.clientTokenHash ? "live" : "waiting",
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      })),
    );
  });

  pro.post("/", async (c) => {
    const parsed = RoomCreateInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const d = parsed.data;
    const pin = d.pin ? String(randomInt(10_000)).padStart(4, "0") : null;
    const expiresAt = new Date(Date.now() + d.expiryHours * 3600_000);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      const [room] = await db
        .insert(rooms)
        .values({
          code,
          psychologistId: c.get("user").id,
          clientLabel: d.clientLabel,
          spread: d.spread,
          choiceMode: d.choiceMode,
          includeShadow: d.includeShadow,
          questionLanguage: d.questionLanguage,
          expiresAt,
          showReturns: d.showReturns,
          videoUrl: d.videoUrl || null,
        })
        .onConflictDoNothing()
        .returning();
      if (!room) continue;
      if (pin) await db.update(rooms).set({ pinHash: pinHash(room.id, pin) }).where(eq(rooms.id, room.id));
      return c.json<RoomCreated>({ id: room.id, code, pin, expiresAt: expiresAt.toISOString() }, 201);
    }
    return c.json({ ok: false, error: "server" }, 500);
  });

  pro.get("/:id", ownRoom, async (c) => {
    const loaded = (await load(c.get("room").id))!;
    return c.json(await psychologistView(loaded.room, loaded.state));
  });

  pro.get("/:id/live", sameOrigin, ownRoom, live("psychologist", (c) => c.req.param("id")!));

  pro.put("/:id/notes", ownRoom, async (c) => {
    const parsed = RoomNotesInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const roomId = c.get("room").id;
    await db
      .insert(sessionNotes)
      .values({ roomId, text: parsed.data.text })
      .onConflictDoUpdate({ target: sessionNotes.roomId, set: { text: parsed.data.text, updatedAt: new Date() } });
    return c.json({ ok: true });
  });

  // "Shared pause": breathing on both screens (spec §10.7).
  pro.post("/:id/pause", ownRoom, async (c) => {
    await act(c.get("room").id, (_room, state) => {
      if (state.ended) throw new RoomError("ended");
      return { type: "pause", at: new Date() };
    });
    return c.json({ ok: true });
  });

  // "Finish and send the summary" (spec §10.8).
  pro.post("/:id/end", ownRoom, async (c) => {
    const parsed = RoomSummaryInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const room = c.get("room");
    const name = c.get("user").displayName;
    await act(room.id, async (r, state) => {
      if (state.ended) throw new RoomError("ended");
      const week = parsed.data.weekQuestion;
      if (week && !weekQuestionAllowed(state, week)) throw new RoomError("not-available");
      const positions = SPREAD_POSITIONS[settingsOf(r).spread];
      const cards = state.confirmed.flatMap((id, i) => (id === null ? [] : [{ position: positions[i]!, cardId: id }]));
      if (cards.length) {
        await db.insert(sessionSummaries).values({
          roomId: r.id,
          clientUserId: r.clientUserId,
          psychologistName: name,
          cards,
          weekCardId: week?.cardId ?? null,
          weekQuestionIndex: week?.index ?? null,
          language: r.questionLanguage,
        });
      }
      await db.update(rooms).set({ endedAt: new Date() }).where(eq(rooms.id, r.id));
      return { type: "ended", at: new Date() };
    });
    return c.json({ ok: true });
  });

  pro.onError(roomErrors);

  // ---------- client (by link code; a guest needs no account) ----------
  type ClientEnv = { Variables: { room: Room } };
  const client = new Hono<ClientEnv>();

  const byCode = async (raw: string) => (await db.select().from(rooms).where(eq(rooms.code, normalizeCode(raw))))[0] ?? null;
  const isClientOf = (c: Context, room: Room) => {
    const token = getCookie(c, clientCookie(room.code));
    return !!token && room.clientTokenHash === hashToken(token);
  };
  const lobbyStatus = (room: Room, now: Date): RoomLobby["status"] =>
    room.endedAt ? "ended" : now >= room.expiresAt ? "expired" : room.pinAttempts >= ROOM_RULES.pinAttempts ? "locked" : room.clientTokenHash ? "joined" : "open";

  const asClient: MiddlewareHandler<ClientEnv> = async (c, next) => {
    const room = await byCode(c.req.param("code") ?? "");
    if (!room || !isClientOf(c, room)) return c.json({ ok: false, error: "not_found" }, 404);
    c.set("room", room);
    await next();
  };
  /** Drawing stops when the link expires; the summary can still be read. */
  const notExpired: MiddlewareHandler<ClientEnv> = async (c, next) => {
    if (new Date() >= c.get("room").expiresAt) return c.json({ ok: false, error: "expired" }, 409);
    await next();
  };

  client.get("/:code", async (c) => {
    const room = await byCode(c.req.param("code"));
    if (!room) return c.json({ ok: false, error: "not_found" }, 404);
    return c.json<RoomLobby>({
      code: room.code,
      psychologistName: await psychologistName(room),
      clientLabel: room.clientLabel,
      spread: room.spread === 1 ? 1 : 3,
      showReturns: room.showReturns,
      pinRequired: room.pinHash !== null,
      status: lobbyStatus(room, new Date()),
      isClient: isClientOf(c, room),
      signedIn: (await findUser(db, c)) !== null,
    });
  });

  const joinLimit = rateLimit({ limit: 20, windowMs: 10 * 60_000 });
  client.post("/:code/join", joinLimit, async (c) => {
    const parsed = RoomJoinInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const room = await byCode(c.req.param("code"));
    if (!room) return c.json({ ok: false, error: "not_found" }, 404);
    if (isClientOf(c, room)) return c.json({ ok: true });
    const status = lobbyStatus(room, new Date());
    if (status !== "open") return c.json({ ok: false, error: status }, 409);
    if (room.pinHash && (!parsed.data.pin || pinHash(room.id, parsed.data.pin) !== room.pinHash)) {
      const [r] = await db
        .update(rooms)
        .set({ pinAttempts: sql`${rooms.pinAttempts} + 1` })
        .where(eq(rooms.id, room.id))
        .returning({ n: rooms.pinAttempts });
      return c.json({ ok: false, error: "wrong_pin", attemptsLeft: Math.max(0, ROOM_RULES.pinAttempts - (r?.n ?? 0)) }, 403);
    }
    const token = newToken();
    const user = await findUser(db, c);
    // Only one client per room: the first to join with the PIN takes it.
    const [taken] = await db
      .update(rooms)
      .set({ clientTokenHash: hashToken(token), clientUserId: user?.id ?? null })
      .where(and(eq(rooms.id, room.id), sql`${rooms.clientTokenHash} is null`))
      .returning({ id: rooms.id });
    if (!taken) return c.json({ ok: false, error: "joined" }, 409);
    setCookie(c, clientCookie(room.code), token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: opts.secureCookies,
      path: "/v1/r",
      maxAge: ROOM_RULES.keepDays * 86400,
    });
    await act(room.id, () => ({ type: "joined", at: new Date() }));
    return c.json({ ok: true });
  });

  client.get("/:code/view", asClient, async (c) => {
    const loaded = (await load(c.get("room").id))!;
    return c.json(await clientView(loaded.room, loaded.state));
  });

  client.get("/:code/live", sameOrigin, asClient, live("client", (c) => c.get("room").id));

  client.post("/:code/draw", asClient, notExpired, async (c) => {
    const parsed = RoomDrawInput.safeParse(await c.req.json().catch(() => ({})));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    const deck = await getDeck();
    await act(c.get("room").id, (room, state) => drawCard(state, settingsOf(room), deck.playable, { now: new Date(), cardId: parsed.data.cardId }));
    return c.json({ ok: true });
  });

  client.post("/:code/return", asClient, notExpired, async (c) => {
    await act(c.get("room").id, (_room, state) => returnCard(state, new Date()));
    return c.json({ ok: true });
  });

  client.post("/:code/confirm", asClient, notExpired, async (c) => {
    const parsed = RoomConfirmInput.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ ok: false, error: "invalid" }, 400);
    await act(c.get("room").id, (_room, state) => confirmCard(state, parsed.data.method, new Date()));
    return c.json({ ok: true });
  });

  client.onError(roomErrors);

  // ---------- session summaries in the client's diary ----------
  const sessions = new Hono<AuthEnv>();
  sessions.use("*", requireUser(db));
  sessions.get("/", async (c) => {
    const rows = await db
      .select()
      .from(sessionSummaries)
      .where(eq(sessionSummaries.clientUserId, c.get("user").id))
      .orderBy(desc(sessionSummaries.sentAt))
      .limit(50);
    return c.json(await Promise.all(rows.map(summaryView)));
  });
  sessions.get("/:id", async (c) => {
    const id = c.req.param("id");
    if (!/^[0-9a-f-]{36}$/.test(id)) return c.json({ ok: false, error: "not_found" }, 404);
    const [row] = await db
      .select()
      .from(sessionSummaries)
      .where(and(eq(sessionSummaries.id, id), eq(sessionSummaries.clientUserId, c.get("user").id)));
    if (!row) return c.json({ ok: false, error: "not_found" }, 404);
    return c.json(await summaryView(row));
  });

  return { pro, client, sessions };
}

function roomErrors(err: Error, c: Context) {
  if (err instanceof RoomError) return c.json({ ok: false, error: err.code }, 409);
  throw err;
}
