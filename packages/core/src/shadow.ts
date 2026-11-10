import { calendarDaysBetween } from "./time";

/** Spec §8: 30 days with Svity and at least 10 diary entries (thresholds are a hypothesis). */
export const SHADOW_RULES = {
  daysNeeded: 30,
  entriesNeeded: 10,
} as const;

export interface ShadowProgress {
  /** The invitation to open shadow cards can be shown. They still need explicit consent. */
  eligible: boolean;
  days: number;
  entries: number;
  daysNeeded: number;
  entriesNeeded: number;
}

/** Progress toward the shadow-cards invitation ("Days with Svity N/30", "Entries N/10"). */
export function shadowProgress(input: { registeredAt: Date; entries: number; now: Date; tz: string }): ShadowProgress {
  const days = Math.max(0, calendarDaysBetween(input.registeredAt, input.now, input.tz));
  return {
    eligible: days >= SHADOW_RULES.daysNeeded && input.entries >= SHADOW_RULES.entriesNeeded,
    days: Math.min(days, SHADOW_RULES.daysNeeded),
    entries: Math.min(input.entries, SHADOW_RULES.entriesNeeded),
    daysNeeded: SHADOW_RULES.daysNeeded,
    entriesNeeded: SHADOW_RULES.entriesNeeded,
  };
}

export const shadowModes = ["on_request", "sometimes"] as const;
export type ShadowMode = (typeof shadowModes)[number];

/** Spec §8.7: the support card after a shadow card, from the light part of the deck (card 11, question 11.3). */
export const SUPPORT_CARD = { cardId: 11, questionIndex: 3 } as const;

export interface ShadowAccess {
  /** Shadow cards and questions may appear in the card of the day. */
  daily: boolean;
  /** The separate "shadow card" button works. */
  onRequest: boolean;
}

/**
 * Spec §8: shadows open by practice and consent, never by payment; the soft stop overrides
 * everything. "On request" means only the separate button; "sometimes" also lets them into the
 * card of the day (the button keeps working).
 */
export function shadowAccess(input: {
  progress: ShadowProgress;
  consentAt: Date | null;
  mode: ShadowMode | null;
  softStop: boolean;
}): ShadowAccess {
  const open = input.progress.eligible && input.consentAt !== null && input.mode !== null && !input.softStop;
  return { daily: open && input.mode === "sometimes", onRequest: open };
}
