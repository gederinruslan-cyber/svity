/**
 * Calendar arithmetic in an IANA time zone, without a date library.
 * All functions take and return absolute instants (`Date`); "local" means wall-clock time in `tz`.
 */

export interface LocalDateTime {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(tz, f);
  }
  return f;
}

/** Throws on an unknown time zone, so bad profile data fails loudly. */
export function assertTimeZone(tz: string): void {
  formatter(tz);
}

/** Wall-clock time of `at` in `tz`. */
export function toLocal(at: Date, tz: string): LocalDateTime {
  const parts: Record<string, number> = {};
  for (const p of formatter(tz).formatToParts(at)) if (p.type !== "literal") parts[p.type] = Number(p.value);
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
  };
}

/** UTC offset of `tz` at instant `at`, in milliseconds (local − UTC). */
function offsetAt(at: Date, tz: string): number {
  const l = toLocal(at, tz);
  const asUtc = Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * The instant at which the wall clock in `tz` shows `local`.
 * If that wall time is skipped by a DST jump, returns the first instant after the gap.
 * If it occurs twice (clocks go back), returns the earlier one.
 */
export function fromLocal(local: Omit<LocalDateTime, "second"> & { second?: number }, tz: string): Date {
  const wall = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second ?? 0);
  // Try the offsets in effect around the target; the earliest exact match wins.
  const candidates = new Set<number>();
  for (const probe of [wall - 36e5 * 26, wall - 36e5 * 2, wall, wall + 36e5 * 2, wall + 36e5 * 26]) {
    candidates.add(wall - offsetAt(new Date(probe), tz));
  }
  const exact = [...candidates].filter((t) => sameWall(toLocal(new Date(t), tz), wall)).sort((a, b) => a - b);
  if (exact.length) return new Date(exact[0]!);
  // Gap: the wall time doesn't exist. Use the earlier offset, which lands just after the jump.
  const before = offsetAt(new Date(wall - 36e5 * 26), tz);
  return new Date(wall - before);
}

function sameWall(l: LocalDateTime, wall: number) {
  return Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second) === wall;
}

/** Adds whole calendar days to a local date (handles month and year ends). */
export function addDays(l: { year: number; month: number; day: number }, days: number) {
  const d = new Date(Date.UTC(l.year, l.month - 1, l.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Local calendar date of `at` in `tz` as "YYYY-MM-DD". */
export function localDateKey(at: Date, tz: string): string {
  const l = toLocal(at, tz);
  return `${l.year}-${String(l.month).padStart(2, "0")}-${String(l.day).padStart(2, "0")}`;
}

/** Whole calendar days between two instants' local dates in `tz` (b − a). */
export function calendarDaysBetween(a: Date, b: Date, tz: string): number {
  const la = toLocal(a, tz);
  const lb = toLocal(b, tz);
  return Math.round(
    (Date.UTC(lb.year, lb.month - 1, lb.day) - Date.UTC(la.year, la.month - 1, la.day)) / 86_400_000,
  );
}
