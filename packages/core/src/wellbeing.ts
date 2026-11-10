import { addDays, localDateKey } from "./time";

/** Feelings that count as strong distress for the soft stop (spec §8). */
export const DISTRESS = ["sadness", "anxiety", "anger"] as const;

export const SOFT_STOP_RULES = {
  /** Consecutive local days whose check-ins all show distress. */
  days: 3,
} as const;

export interface CheckIn {
  at: Date;
  before: string;
  after: string;
}

const distressed = (f: string) => (DISTRESS as readonly string[]).includes(f);

/**
 * Soft stop (spec §8): when check-ins show strong distress several days in a row, shadow cards
 * aren't offered; support is shown instead. A day counts if every check-in that day ended in
 * distress (the "after" feeling). The run must reach today or yesterday to still apply.
 */
export function softStop(checkIns: readonly CheckIn[], now: Date, tz: string): boolean {
  const byDay = new Map<string, boolean>();
  for (const c of checkIns) {
    const key = localDateKey(c.at, tz);
    byDay.set(key, (byDay.get(key) ?? true) && distressed(c.after));
  }
  const today = localDateKey(now, tz);
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const key = (offset: number) => {
    const l = addDays({ year: y, month: m, day: d }, -offset);
    return `${l.year}-${String(l.month).padStart(2, "0")}-${String(l.day).padStart(2, "0")}`;
  };
  // Start from today if there's a check-in today, else yesterday.
  let offset = byDay.has(today) ? 0 : 1;
  let run = 0;
  while (byDay.get(key(offset)) === true) {
    run++;
    offset++;
  }
  return run >= SOFT_STOP_RULES.days;
}

export interface FeelingStats {
  total: number;
  /** "After a card it felt lighter in X of Y entries" (spec §7). */
  lighter: number;
  /** Most frequent feelings after a card, most common first (up to 3). */
  topAfter: { feeling: string; count: number }[];
}

/** Feelings are ranked from heavy to light; moving toward light counts as "lighter". */
const WEIGHT: Record<string, number> = {
  anger: 0,
  anxiety: 0,
  sadness: 0,
  tiredness: 1,
  tenderness: 2,
  hope: 2,
  calm: 2,
};

export function feelingStats(checkIns: readonly CheckIn[]): FeelingStats {
  let lighter = 0;
  const counts = new Map<string, number>();
  for (const c of checkIns) {
    if ((WEIGHT[c.after] ?? 1) > (WEIGHT[c.before] ?? 1)) lighter++;
    counts.set(c.after, (counts.get(c.after) ?? 0) + 1);
  }
  const topAfter = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([feeling, count]) => ({ feeling, count }));
  return { total: checkIns.length, lighter, topAfter };
}
