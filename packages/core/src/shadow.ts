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

/** Shadow cards may be shown only when eligible, consented to, and switched on. */
export function shadowAllowed(input: {
  progress: ShadowProgress;
  consentAt: Date | null;
  enabled: boolean;
}): boolean {
  return input.progress.eligible && input.consentAt !== null && input.enabled;
}
