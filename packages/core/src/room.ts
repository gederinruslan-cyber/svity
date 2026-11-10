import type { CardMeta, Rng } from "./daily";

/** Spec §10. */
export const ROOM_RULES = {
  /** Room data (events, notes) is kept this long, then deleted. */
  keepDays: 30,
  pinAttempts: 5,
  faceUpChoices: 12,
  /** The shared pause shows breathing on both screens for this long. */
  pauseMs: 60_000,
  expiryHours: [24, 72] as const,
} as const;

export type Spread = 1 | 3;
export type ChoiceMode = "down" | "up";

/** Position keys; the labels live in i18n. 3 cards: "What is — What's in the way — What will help". */
export const SPREAD_POSITIONS: Record<Spread, readonly ("focus" | "is" | "blocks" | "helps")[]> = {
  1: ["focus"],
  3: ["is", "blocks", "helps"],
};

export interface RoomSettings {
  spread: Spread;
  choiceMode: ChoiceMode;
  includeShadow: boolean;
  showReturns: boolean;
}

export type RoomEventType = "joined" | "drawn" | "returned" | "confirmed" | "pause" | "ended";

export interface RoomEvent {
  type: RoomEventType;
  cardId?: number | null;
  position?: number | null;
  method?: "button" | "double_tap" | null;
  at: Date;
}

export interface RoomState {
  joined: boolean;
  ended: boolean;
  /** The card the client is looking at; never shown to the psychologist. */
  held: { cardId: number; position: number } | null;
  /** Confirmed card per position (null = still empty). */
  confirmed: (number | null)[];
  returns: number;
  pauseAt: Date | null;
}

export class RoomError extends Error {
  constructor(
    readonly code: "not-joined" | "ended" | "holding" | "not-holding" | "full" | "not-available" | "deck-empty",
  ) {
    super(code);
  }
}

/** Rebuilds the room from its event log (the log is the source of truth). */
export function replay(settings: RoomSettings, events: readonly RoomEvent[]): RoomState {
  const s: RoomState = {
    joined: false,
    ended: false,
    held: null,
    confirmed: Array<number | null>(settings.spread).fill(null),
    returns: 0,
    pauseAt: null,
  };
  for (const e of events) {
    if (e.type === "joined") s.joined = true;
    else if (e.type === "drawn" && e.cardId != null && e.position != null) s.held = { cardId: e.cardId, position: e.position };
    else if (e.type === "returned") {
      s.held = null;
      s.returns++;
    } else if (e.type === "confirmed" && s.held) {
      s.confirmed[s.held.position] = s.held.cardId;
      s.held = null;
    } else if (e.type === "pause") s.pauseAt = e.at;
    else if (e.type === "ended") s.ended = true;
  }
  return s;
}

/** The first empty position, or null when the spread is complete. */
export function nextPosition(s: RoomState): number | null {
  const i = s.confirmed.indexOf(null);
  return i === -1 ? null : i;
}

/** Cards that can still come out: not confirmed, not in the client's hand; shadows only if the room allows them. */
export function roomDeck(s: RoomState, settings: RoomSettings, deck: readonly CardMeta[]): CardMeta[] {
  const taken = new Set([...s.confirmed.filter((x): x is number => x !== null), ...(s.held ? [s.held.cardId] : [])]);
  return deck.filter((c) => !taken.has(c.id) && (settings.includeShadow || c.tone !== "shadow"));
}

function assertCanAct(s: RoomState) {
  if (s.ended) throw new RoomError("ended");
  if (!s.joined) throw new RoomError("not-joined");
}

/**
 * Face down: the server picks at random. Face up: the client picks `cardId` from the open cards.
 * Returned cards go back into the deck and can come out again.
 */
export function drawCard(
  s: RoomState,
  settings: RoomSettings,
  deck: readonly CardMeta[],
  opts: { now: Date; cardId?: number; rng?: Rng },
): RoomEvent {
  assertCanAct(s);
  if (s.held) throw new RoomError("holding");
  const position = nextPosition(s);
  if (position === null) throw new RoomError("full");
  const pool = roomDeck(s, settings, deck);
  if (!pool.length) throw new RoomError("deck-empty");
  let cardId: number;
  if (settings.choiceMode === "up") {
    if (opts.cardId === undefined || !pool.some((c) => c.id === opts.cardId)) throw new RoomError("not-available");
    cardId = opts.cardId;
  } else {
    cardId = pool[Math.floor((opts.rng ?? Math.random)() * pool.length)]!.id;
  }
  return { type: "drawn", cardId, position, at: opts.now };
}

export function returnCard(s: RoomState, now: Date): RoomEvent {
  assertCanAct(s);
  if (!s.held) throw new RoomError("not-holding");
  return { type: "returned", cardId: s.held.cardId, position: s.held.position, at: now };
}

/** "Discuss this card": the psychologist sees it from now on (spec §10.5). */
export function confirmCard(s: RoomState, method: "button" | "double_tap", now: Date): RoomEvent {
  assertCanAct(s);
  if (!s.held) throw new RoomError("not-holding");
  return { type: "confirmed", cardId: s.held.cardId, position: s.held.position, method, at: now };
}

/** A random set of open cards to choose from in face-up mode. */
export function faceUpChoices(s: RoomState, settings: RoomSettings, deck: readonly CardMeta[], rng: Rng = Math.random): number[] {
  const pool = roomDeck(s, settings, deck).map((c) => c.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, ROOM_RULES.faceUpChoices).sort((a, b) => a - b);
}

/** Deterministic RNG from a string seed (mulberry32), so the open cards don't reshuffle on every update. */
export function seededRng(seed: string): Rng {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = (h << 13) | (h >>> 19);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pauseActive(s: RoomState, now: Date): boolean {
  return s.pauseAt !== null && now.getTime() - s.pauseAt.getTime() < ROOM_RULES.pauseMs;
}

/**
 * What the psychologist may know (spec §4, §10): confirmed cards and, if the room shows it, the
 * return count. Never the card in the client's hand or which cards were returned.
 */
export function psychologistState(s: RoomState, settings: RoomSettings) {
  return {
    joined: s.joined,
    ended: s.ended,
    confirmed: s.confirmed,
    returns: settings.showReturns ? s.returns : null,
  };
}

/** The week question must be one of the questions of a confirmed card (spec §10.8). */
export function weekQuestionAllowed(s: RoomState, q: { cardId: number; index: number }): boolean {
  return s.confirmed.includes(q.cardId) && q.index >= 1 && q.index <= 3;
}

export function roomExpired(room: { expiresAt: Date }, now: Date): boolean {
  return now >= room.expiresAt;
}
