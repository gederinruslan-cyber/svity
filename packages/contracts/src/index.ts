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

// ---------- auth ----------

export const SignInInput = z.object({
  email: z.email().max(254),
  locale: Locale,
});
export type SignInInput = z.infer<typeof SignInInput>;

export const VerifyInput = z.object({
  token: z.string().min(20).max(200),
  /** The browser's IANA zone; stored on first sign-in for the daily-card timer. */
  timezone: z.string().min(1).max(64),
  /** Language of the page the link opened; becomes the account language on first sign-in. */
  locale: Locale,
});
export type VerifyInput = z.infer<typeof VerifyInput>;

export const addressForms = ["f", "m", "n"] as const;

export interface Me {
  id: string;
  email: string;
  role: "personal" | "professional";
  locale: Locale;
  addressForm: (typeof addressForms)[number];
  timezone: string;
  createdAt: string;
}

export type ApiError = { ok: false; error: string };

// ---------- daily card ----------

export const feelings = ["calm", "hope", "tenderness", "tiredness", "sadness", "anxiety", "anger"] as const;
export const Feeling = z.enum(feelings);
export type Feeling = z.infer<typeof Feeling>;
