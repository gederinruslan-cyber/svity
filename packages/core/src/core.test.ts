import { describe, expect, it } from "vitest";
import {
  type CardMeta,
  DrawError,
  canDraw,
  closeDraw,
  currentCard,
  eligibleCards,
  fromLocal,
  localDateKey,
  monthRange,
  nextAvailableAt,
  pickQuestion,
  repick,
  saveDraw,
  shadowAllowed,
  shadowProgress,
  startDraw,
  toLocal,
} from "./index";

const KYIV = "Europe/Kyiv";
const at = (local: string, tz = KYIV) => {
  const [d, t = "00:00"] = local.split(" ");
  const [year, month, day] = d!.split("-").map(Number);
  const [hour, minute] = t.split(":").map(Number);
  return fromLocal({ year: year!, month: month!, day: day!, hour: hour!, minute: minute! }, tz);
};
const local = (d: Date, tz = KYIV) => {
  const l = toLocal(d, tz);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${l.year}-${p(l.month)}-${p(l.day)} ${p(l.hour)}:${p(l.minute)}`;
};

describe("timer (spec §6)", () => {
  it("before 18:00 → the next midnight", () => {
    expect(local(nextAvailableAt(at("2026-11-10 15:00"), KYIV))).toBe("2026-11-11 00:00");
    expect(local(nextAvailableAt(at("2026-11-10 00:00"), KYIV))).toBe("2026-11-11 00:00");
    expect(local(nextAvailableAt(at("2026-11-10 17:59"), KYIV))).toBe("2026-11-11 00:00");
  });

  it("from 18:00 → tomorrow at 12:00", () => {
    expect(local(nextAvailableAt(at("2026-11-10 18:00"), KYIV))).toBe("2026-11-11 12:00");
    expect(local(nextAvailableAt(at("2026-11-10 20:30"), KYIV))).toBe("2026-11-11 12:00");
    expect(local(nextAvailableAt(at("2026-11-10 23:59"), KYIV))).toBe("2026-11-11 12:00");
  });

  it("spec examples: 15:00 → wait 9 h; 20:30 → wait 15 h 30 min", () => {
    const h = (a: Date, b: Date) => (b.getTime() - a.getTime()) / 36e5;
    expect(h(at("2026-11-10 15:00"), nextAvailableAt(at("2026-11-10 15:00"), KYIV))).toBe(9);
    expect(h(at("2026-11-10 20:30"), nextAvailableAt(at("2026-11-10 20:30"), KYIV))).toBe(15.5);
  });

  it("crosses month and year ends", () => {
    expect(local(nextAvailableAt(at("2026-12-31 10:00"), KYIV))).toBe("2027-01-01 00:00");
    expect(local(nextAvailableAt(at("2027-02-28 19:00"), KYIV))).toBe("2027-03-01 12:00");
  });

  it("clocks go forward (Kyiv, 28 Mar 2027): the next midnight is still local midnight, 23 h day", () => {
    const flip = at("2027-03-27 23:00");
    const next = nextAvailableAt(at("2027-03-27 10:00"), KYIV);
    expect(local(next)).toBe("2027-03-28 00:00");
    // Drawn at 20:00 the day before the change: tomorrow 12:00 is 15 h of real time, not 16.
    const evening = nextAvailableAt(at("2027-03-27 20:00"), KYIV);
    expect(local(evening)).toBe("2027-03-28 12:00");
    expect((evening.getTime() - at("2027-03-27 20:00").getTime()) / 36e5).toBe(15);
    expect(flip.getTime()).toBeLessThan(evening.getTime());
  });

  it("clocks go back (Kyiv, 25 Oct 2026): no second card during the repeated hour", () => {
    const evening = nextAvailableAt(at("2026-10-24 20:00"), KYIV);
    expect(local(evening)).toBe("2026-10-25 12:00");
    expect((evening.getTime() - at("2026-10-24 20:00").getTime()) / 36e5).toBe(17);
  });

  it("a midnight that doesn't exist (Santiago jumps 24:00 → 01:00) resolves to the first instant after", () => {
    const tz = "America/Santiago";
    const next = nextAvailableAt(at("2026-09-05 15:00", tz), tz);
    expect(local(next, tz)).toBe("2026-09-06 01:00");
  });

  it("the profile time zone matters, not the server's", () => {
    const flip = new Date("2026-11-10T21:00:00Z"); // 23:00 in Kyiv, 16:00 in New York
    expect(local(nextAvailableAt(flip, KYIV))).toBe("2026-11-11 12:00");
    expect(local(nextAvailableAt(flip, "America/New_York"), "America/New_York")).toBe("2026-11-11 00:00");
  });
});

const deck: CardMeta[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  tone: i === 9 ? "shadow" : "light",
}));
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length]!;
};

describe("daily draw", () => {
  const now = at("2026-11-10 09:00");

  it("one draw per period; closing without saving still uses the card", () => {
    const d = closeDraw(startDraw(null, deck, { now, tz: KYIV }));
    expect(canDraw(d, at("2026-11-10 23:00")).ok).toBe(false);
    expect(() => startDraw(d, deck, { now: at("2026-11-10 23:00"), tz: KYIV })).toThrow(DrawError);
    expect(canDraw(d, at("2026-11-11 00:00")).ok).toBe(true);
  });

  it("up to 5 repicks, never repeating a card, first flip unchanged", () => {
    let d = startDraw(null, deck, { now, tz: KYIV, rng: seq(0) });
    for (let i = 0; i < 5; i++) d = repick(d, deck, seq(0));
    expect(d.cardsSeen).toHaveLength(6);
    expect(new Set(d.cardsSeen).size).toBe(6);
    expect(d.repicksLeft).toBe(0);
    expect(d.firstFlipAt).toEqual(now);
    expect(() => repick(d, deck)).toThrowError("no-repicks");
    expect(currentCard(d)).toBe(d.cardsSeen[5]);
  });

  it("no repicks after saving or closing", () => {
    const d = saveDraw(startDraw(null, deck, { now, tz: KYIV }));
    expect(() => repick(d, deck)).toThrowError("not-open");
    expect(() => closeDraw(d)).toThrowError("not-open");
  });

  it("shadow cards stay out of the daily deck unless switched on", () => {
    expect(eligibleCards(deck, { includeShadow: false }).some((c) => c.tone === "shadow")).toBe(false);
    expect(eligibleCards(deck, { includeShadow: true })).toHaveLength(10);
  });
});

describe("question choice", () => {
  const qs = [
    { index: 1, tone: "light", needsRequest: false },
    { index: 2, tone: "shadow", needsRequest: false },
    { index: 3, tone: "neutral", needsRequest: true },
  ] as const;

  it("skips request-only and shadow questions when not allowed", () => {
    for (const r of [0, 0.5, 0.99]) {
      expect(pickQuestion(qs, { hasRequest: false, allowShadow: false, rng: () => r })).toBe(1);
    }
  });

  it("allows them when there is a request / shadow access", () => {
    const seen = new Set([0, 0.5, 0.99].map((r) => pickQuestion(qs, { hasRequest: true, allowShadow: true, rng: () => r })));
    expect(seen).toEqual(new Set([1, 2, 3]));
  });
});

describe("shadow cards (spec §8)", () => {
  const registeredAt = at("2026-10-01 22:00");

  it("needs 30 calendar days and 10 entries", () => {
    expect(shadowProgress({ registeredAt, entries: 10, now: at("2026-10-30 23:59"), tz: KYIV }).eligible).toBe(false);
    expect(shadowProgress({ registeredAt, entries: 10, now: at("2026-10-31 00:00"), tz: KYIV }).eligible).toBe(true);
    expect(shadowProgress({ registeredAt, entries: 9, now: at("2026-12-01 12:00"), tz: KYIV }).eligible).toBe(false);
  });

  it("caps progress at the thresholds and needs consent and the switch", () => {
    const progress = shadowProgress({ registeredAt, entries: 40, now: at("2027-01-01 12:00"), tz: KYIV });
    expect(progress).toMatchObject({ days: 30, entries: 10, eligible: true });
    expect(shadowAllowed({ progress, consentAt: null, enabled: true })).toBe(false);
    expect(shadowAllowed({ progress, consentAt: new Date(), enabled: false })).toBe(false);
    expect(shadowAllowed({ progress, consentAt: new Date(), enabled: true })).toBe(true);
  });
});

describe("month range", () => {
  it("is local, and spans the DST change in October", () => {
    const { start, end } = monthRange(2026, 10, KYIV);
    expect(local(start)).toBe("2026-10-01 00:00");
    expect(local(end)).toBe("2026-11-01 00:00");
    // 31 days plus the extra hour from clocks going back.
    expect((end.getTime() - start.getTime()) / 36e5).toBe(31 * 24 + 1);
    expect(localDateKey(new Date(end.getTime() - 1), KYIV)).toBe("2026-10-31");
  });

  it("rolls over the year", () => {
    expect(local(monthRange(2026, 12, KYIV).end)).toBe("2027-01-01 00:00");
  });
});

import { feelingStats, softStop } from "./wellbeing";

describe("soft stop (spec §8)", () => {
  const ci = (local: string, after: string, before = "tiredness") => ({ at: at(local), before, after });
  const now = at("2026-11-10 20:00");

  it("three distressed days in a row, up to today or yesterday", () => {
    expect(softStop([ci("2026-11-08 10:00", "sadness"), ci("2026-11-09 10:00", "anxiety"), ci("2026-11-10 10:00", "anger")], now, KYIV)).toBe(true);
    expect(softStop([ci("2026-11-07 10:00", "sadness"), ci("2026-11-08 10:00", "anxiety"), ci("2026-11-09 10:00", "anger")], now, KYIV)).toBe(true);
  });

  it("a calm day, a gap, or an old run breaks it", () => {
    expect(softStop([ci("2026-11-08 10:00", "sadness"), ci("2026-11-09 10:00", "calm"), ci("2026-11-10 10:00", "anger")], now, KYIV)).toBe(false);
    expect(softStop([ci("2026-11-07 10:00", "sadness"), ci("2026-11-09 10:00", "anxiety"), ci("2026-11-10 10:00", "anger")], now, KYIV)).toBe(false);
    expect(softStop([ci("2026-11-01 10:00", "sadness"), ci("2026-11-02 10:00", "anxiety"), ci("2026-11-03 10:00", "anger")], now, KYIV)).toBe(false);
  });

  it("a day counts only if every check-in that day ended in distress", () => {
    const xs = [ci("2026-11-08 10:00", "sadness"), ci("2026-11-09 10:00", "anxiety"), ci("2026-11-10 09:00", "anger"), ci("2026-11-10 19:00", "calm")];
    expect(softStop(xs, now, KYIV)).toBe(false);
  });

  it("uses local days: 23:30 and 00:30 are different days", () => {
    const xs = [ci("2026-11-08 23:30", "sadness"), ci("2026-11-09 00:30", "anxiety"), ci("2026-11-10 10:00", "anger")];
    expect(softStop(xs, now, KYIV)).toBe(true);
  });
});

describe("feeling stats", () => {
  it("counts lighter entries and the top feelings after", () => {
    const xs = [
      { at: new Date(), before: "anxiety", after: "calm" },
      { at: new Date(), before: "tiredness", after: "calm" },
      { at: new Date(), before: "calm", after: "calm" },
      { at: new Date(), before: "hope", after: "sadness" },
      { at: new Date(), before: "sadness", after: "hope" },
    ];
    expect(feelingStats(xs)).toEqual({
      total: 5,
      lighter: 3,
      topAfter: [
        { feeling: "calm", count: 3 },
        { feeling: "hope", count: 1 },
        { feeling: "sadness", count: 1 },
      ],
    });
  });
});
