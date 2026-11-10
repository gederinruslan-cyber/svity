import { addDays, fromLocal, toLocal } from "./time";

/** Spec §6 "Карта дня". */
export const DAILY_RULES = {
  /** Drawn at or after this local hour → next card tomorrow at `middayHour`, otherwise at the next midnight. */
  eveningHour: 18,
  middayHour: 12,
  /** Up to 5 replacements, so up to 6 cards a day. */
  maxRepicks: 5,
} as const;

export type Tone = "light" | "neutral" | "shadow";
export type DrawStatus = "open" | "saved" | "closed";
export type Rng = () => number;

export interface CardMeta {
  id: number;
  tone: Tone;
}

export interface QuestionMeta {
  index: 1 | 2 | 3;
  tone: Tone;
  /** Only shown when the user wrote a request to themselves (questions 1.3, 7.3, 13.3, 110.3). */
  needsRequest: boolean;
}

export interface DailyDraw {
  /** The first flip; repicks don't move it. */
  firstFlipAt: Date;
  nextAvailableAt: Date;
  /** Every card shown today, in order; the last one is the current card. */
  cardsSeen: number[];
  repicksLeft: number;
  status: DrawStatus;
}

/**
 * When the next daily card becomes available, given the first flip and the profile time zone.
 * Calendar arithmetic, not "+24h": DST changes never give a second card or a long wait.
 */
export function nextAvailableAt(firstFlipAt: Date, tz: string): Date {
  const local = toLocal(firstFlipAt, tz);
  const tomorrow = addDays(local, 1);
  const hour = local.hour < DAILY_RULES.eveningHour ? 0 : DAILY_RULES.middayHour;
  return fromLocal({ ...tomorrow, hour, minute: 0 }, tz);
}

export type CanDraw = { ok: true } | { ok: false; nextAvailableAt: Date };

/** Whether a new daily card may be drawn now. Closing without saving still uses up the card. */
export function canDraw(last: DailyDraw | null, now: Date): CanDraw {
  if (!last || now.getTime() >= last.nextAvailableAt.getTime()) return { ok: true };
  return { ok: false, nextAvailableAt: last.nextAvailableAt };
}

/** Cards that may come up in the daily draw. Shadow cards only when the user turned on "sometimes in the daily card". */
export function eligibleCards(cards: readonly CardMeta[], opts: { includeShadow: boolean }): CardMeta[] {
  return cards.filter((c) => opts.includeShadow || c.tone !== "shadow");
}

function pick<T>(items: readonly T[], rng: Rng): T | undefined {
  if (!items.length) return undefined;
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

export class DrawError extends Error {
  constructor(
    readonly code: "not-available" | "deck-empty" | "no-repicks" | "not-open" | "deck-exhausted",
    readonly nextAvailableAt?: Date,
  ) {
    super(code);
  }
}

/** Starts today's draw with its first card (the moment of the first flip). */
export function startDraw(
  last: DailyDraw | null,
  deck: readonly CardMeta[],
  opts: { now: Date; tz: string; rng?: Rng },
): DailyDraw {
  const allowed = canDraw(last, opts.now);
  if (!allowed.ok) throw new DrawError("not-available", allowed.nextAvailableAt);
  const card = pick(deck, opts.rng ?? Math.random);
  if (!card) throw new DrawError("deck-empty");
  return {
    firstFlipAt: opts.now,
    nextAvailableAt: nextAvailableAt(opts.now, opts.tz),
    cardsSeen: [card.id],
    repicksLeft: DAILY_RULES.maxRepicks,
    status: "open",
  };
}

/** "Not my card · take another": a card not yet seen today. */
export function repick(draw: DailyDraw, deck: readonly CardMeta[], rng: Rng = Math.random): DailyDraw {
  if (draw.status !== "open") throw new DrawError("not-open");
  if (draw.repicksLeft <= 0) throw new DrawError("no-repicks");
  const card = pick(
    deck.filter((c) => !draw.cardsSeen.includes(c.id)),
    rng,
  );
  if (!card) throw new DrawError("deck-exhausted");
  return { ...draw, cardsSeen: [...draw.cardsSeen, card.id], repicksLeft: draw.repicksLeft - 1 };
}

export function currentCard(draw: DailyDraw): number {
  return draw.cardsSeen[draw.cardsSeen.length - 1]!;
}

/** The feelings check-in "after" saves the entry. */
export function saveDraw(draw: DailyDraw): DailyDraw {
  if (draw.status !== "open") throw new DrawError("not-open");
  return { ...draw, status: "saved" };
}

/** "Close without saving": nothing is recorded, but today's card counts as used. */
export function closeDraw(draw: DailyDraw): DailyDraw {
  if (draw.status !== "open") throw new DrawError("not-open");
  return { ...draw, status: "closed" };
}

/**
 * One of the card's three questions, at random.
 * Request-only questions need a request; shadow-toned questions need shadow access.
 * Falls back to any question rather than showing none.
 */
export function pickQuestion(
  questions: readonly QuestionMeta[],
  opts: { hasRequest: boolean; allowShadow: boolean; rng?: Rng },
): QuestionMeta["index"] {
  const fits = questions.filter(
    (q) => (opts.hasRequest || !q.needsRequest) && (opts.allowShadow || q.tone !== "shadow"),
  );
  const q = pick(fits.length ? fits : questions, opts.rng ?? Math.random);
  if (!q) throw new Error("card has no questions");
  return q.index;
}
