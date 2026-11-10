import { z } from "zod";

export const locales = ["uk", "en"] as const;
export const Locale = z.enum(locales);
export type Locale = z.infer<typeof Locale>;

// `website` is a honeypot: real users never see or fill it.
const honeypot = { website: z.string().max(0).optional() };

export const WaitlistInput = z.object({
  email: z.email().max(254),
  locale: Locale,
  ...honeypot,
});
export type WaitlistInput = z.infer<typeof WaitlistInput>;

export const specializations = ["psychologist", "psychotherapist", "coach", "other"] as const;

export const BetaApplicationInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  specialization: z.enum(specializations),
  country: z.string().trim().min(1).max(80),
  usesCards: z.boolean(),
  message: z.string().trim().max(2000).optional(),
  locale: Locale,
  ...honeypot,
});
export type BetaApplicationInput = z.infer<typeof BetaApplicationInput>;

export type SubmitResult = { ok: true } | { ok: false; error: "invalid" | "rate_limited" | "server" };
