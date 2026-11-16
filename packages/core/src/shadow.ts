import { calendarDaysBetween } from "./time";

/** Shadow cards join the deck 8 calendar days after sign-up, with no consent step. */
export const SHADOW_RULES = {
  daysNeeded: 8,
} as const;

export interface ShadowProgress {
  /** Enough days have passed: shadow cards are in the deck (unless turned off). */
  eligible: boolean;
  days: number;
  daysNeeded: number;
}

/** Progress toward shadow cards ("Days with Svity N/8"). */
export function shadowProgress(input: { registeredAt: Date; now: Date; tz: string }): ShadowProgress {
  const days = Math.max(0, calendarDaysBetween(input.registeredAt, input.now, input.tz));
  return {
    eligible: days >= SHADOW_RULES.daysNeeded,
    days: Math.min(days, SHADOW_RULES.daysNeeded),
    daysNeeded: SHADOW_RULES.daysNeeded,
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
 * Shadows open by time, never by payment. "Sometimes" (the default) lets them into the card of
 * the day and the separate button works; "on request" means only the button; null means off.
 */
export function shadowAccess(input: {
  progress: ShadowProgress;
  mode: ShadowMode | null;
}): ShadowAccess {
  const open = input.progress.eligible && input.mode !== null;
  return { daily: open && input.mode === "sometimes", onRequest: open };
}
