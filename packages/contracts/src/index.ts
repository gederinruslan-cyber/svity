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

/** Length is the only rule (NIST 800-63B): no forced symbols or digits. */
export const PASSWORD_MIN = 10;
const NewPassword = z.string().min(PASSWORD_MIN).max(200);

export const SignUpInput = z.object({
  email: z.email().max(254),
  password: NewPassword,
  /** The browser's IANA zone, for the daily-card timer. */
  timezone: z.string().min(1).max(64),
  /** Page language; becomes the account language. */
  locale: Locale,
});
export type SignUpInput = z.infer<typeof SignUpInput>;

export const SignInInput = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});
export type SignInInput = z.infer<typeof SignInInput>;

export const ForgotPasswordInput = z.object({ email: z.email().max(254), locale: Locale });
export const ResetPasswordInput = z.object({ token: z.string().min(20).max(200), password: NewPassword });
export const ChangePasswordInput = z.object({ current: z.string().min(1).max(200), password: NewPassword });

export const addressForms = ["f", "m", "n"] as const;
export const reminderTimes = ["09:00", "12:00", "20:00"] as const;

export const ProfilePatch = z
  .object({
    locale: Locale,
    addressForm: z.enum(addressForms),
    timezone: z.string().min(1).max(64),
    reminderTime: z.enum(reminderTimes).nullable(),
    displayName: z.string().trim().min(1).max(60),
  })
  .partial()
  .refine((p) => Object.keys(p).length > 0, "nothing to update");
export type ProfilePatch = z.infer<typeof ProfilePatch>;

export interface ProfileStats {
  entries: number;
  /** "After a card it felt lighter in X of Y entries". */
  lighter: number;
  topAfter: { feeling: Feeling; count: number }[];
  shadow: {
    days: number;
    daysNeeded: number;
    entries: number;
    entriesNeeded: number;
    eligible: boolean;
    consented: boolean;
    mode: ShadowMode | null;
    /** Several days of strong distress: shadows aren't offered, support is (spec §8). */
    softStop: boolean;
  };
}

export interface Me {
  id: string;
  email: string;
  role: "personal" | "professional";
  locale: Locale;
  addressForm: (typeof addressForms)[number];
  timezone: string;
  reminderTime: (typeof reminderTimes)[number] | null;
  displayName: string | null;
  createdAt: string;
}

export type ApiError = { ok: false; error: string };

// ---------- daily card ----------

export const feelings = ["calm", "hope", "tenderness", "tiredness", "sadness", "anxiety", "anger"] as const;
export const Feeling = z.enum(feelings);
export type Feeling = z.infer<typeof Feeling>;

export const DrawInput = z.object({
  feelingBefore: Feeling,
  /** Optional "question to myself" (spec §6 step 2). */
  request: z.string().trim().max(500).optional(),
});
export type DrawInput = z.infer<typeof DrawInput>;

export const SaveInput = z.object({
  feelingAfter: Feeling,
  note: z.string().trim().max(10_000).optional(),
});
export type SaveInput = z.infer<typeof SaveInput>;

export interface CardView {
  id: number;
  /** Short-lived signed URL; never store it. */
  imageUrl: string;
  questionIndex: number;
  question: string;
  /** A shadow card or a shadow question: the UI switches to the evening theme (spec §8.5). */
  isShadow: boolean;
}

export type TodayView =
  /** A new card can be drawn. */
  | { state: "ready" }
  /** Drawn and not yet saved or closed. */
  | {
      state: "open";
      card: CardView;
      repicksLeft: number;
      feelingBefore: Feeling;
      request: string | null;
      nextAvailableAt: string;
      /** After a shadow card: breathing, then this support card (spec §8.6–8.7). */
      support: CardView | null;
    }
  /** Saved or closed; the next card comes at `nextAvailableAt` (local midnight or 12:00). */
  | { state: "done"; nextAvailableAt: string; entry: EntryView | null };

export interface EntryView {
  id: string;
  card: CardView;
  request: string | null;
  feelingBefore: Feeling;
  feelingAfter: Feeling;
  note: string | null;
  isShadow: boolean;
  isFavorite: boolean;
  createdAt: string;
  editedAt: string | null;
}

export interface EntriesPage {
  entries: EntryView[];
  /** Pass as `?before=` to load older entries; null when there are none. */
  next: string | null;
}

export const EntryPatch = z
  .object({
    note: z.string().trim().max(10_000).nullable().optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine((p) => p.note !== undefined || p.isFavorite !== undefined, "nothing to update");
export type EntryPatch = z.infer<typeof EntryPatch>;

/** One local calendar month of the diary, for the mosaic (spec §7). */
export interface MonthView {
  /** "YYYY-MM" in the profile time zone. */
  month: string;
  /** Number of diary entries this month. */
  count: number;
  /** One cell per day that has entries: the latest card of that day. */
  days: { day: number; entryId: string; card: CardView }[];
  /** "YYYY-MM" of the months before/after with any entries; null when there are none. */
  prev: string | null;
  next: string | null;
}

export const shadowModes = ["on_request", "sometimes"] as const;
export type ShadowMode = (typeof shadowModes)[number];

export const ShadowSettings = z.object({
  mode: z.enum(shadowModes).nullable(),
  /** Required the first time: "I understand and want to try" (spec §8.3). */
  understood: z.literal(true).optional(),
});
export type ShadowSettings = z.infer<typeof ShadowSettings>;

export const ShadowDrawInput = z.object({ feelingBefore: Feeling });

/** The separate shadow-card flow (spec §8), one card per local day. */
export type ShadowView =
  | { state: "locked"; softStop: boolean }
  | { state: "ready" }
  | { state: "open"; card: CardView; support: CardView; feelingBefore: Feeling }
  | { state: "used"; entry: EntryView | null };

// ---------- rooms (spec §10) ----------

/** Spread positions; labels in i18n `app.room.positions`. */
export const positionKeys = ["focus", "is", "blocks", "helps"] as const;
export type PositionKey = (typeof positionKeys)[number];

export const RoomCreateInput = z.object({
  clientLabel: z.string().trim().min(1).max(60),
  spread: z.union([z.literal(1), z.literal(3)]),
  choiceMode: z.enum(["down", "up"]),
  includeShadow: z.boolean(),
  questionLanguage: Locale,
  expiryHours: z.union([z.literal(24), z.literal(72)]),
  pin: z.boolean(),
  showReturns: z.boolean(),
  videoUrl: z.url({ protocol: /^https$/ }).max(500).optional().or(z.literal("")),
});
export type RoomCreateInput = z.infer<typeof RoomCreateInput>;

export const DisplayNameInput = z.object({ displayName: z.string().trim().min(1).max(60) });

/** A room in the psychologist's cabinet. */
export interface RoomListItem {
  id: string;
  code: string;
  clientLabel: string;
  spread: 1 | 3;
  status: "waiting" | "live" | "ended" | "expired";
  expiresAt: string;
  createdAt: string;
}

/** Created: the link and the PIN are shown once. */
export interface RoomCreated {
  id: string;
  code: string;
  pin: string | null;
  expiresAt: string;
}

/** Before joining: what the client agrees to (spec §10.1). Public, by link code. */
export interface RoomLobby {
  code: string;
  psychologistName: string | null;
  clientLabel: string;
  spread: 1 | 3;
  showReturns: boolean;
  pinRequired: boolean;
  status: "open" | "joined" | "ended" | "expired" | "locked";
  /** This browser is already the client of the room. */
  isClient: boolean;
  signedIn: boolean;
}

export const RoomJoinInput = z.object({
  pin: z.string().regex(/^\d{4}$/).optional(),
  agree: z.literal(true),
});

export const RoomDrawInput = z.object({ cardId: z.number().int().positive().optional() });
export const RoomConfirmInput = z.object({ method: z.enum(["button", "double_tap"]) });
export const RoomNotesInput = z.object({ text: z.string().max(20_000) });
export const RoomSummaryInput = z.object({
  weekQuestion: z.object({ cardId: z.number().int(), index: z.number().int().min(1).max(3) }).nullable(),
});

export interface RoomCard {
  id: number;
  imageUrl: string;
}

export interface SessionSummaryView {
  id: string;
  psychologistName: string | null;
  cards: { position: PositionKey; card: RoomCard }[];
  weekQuestion: string | null;
  sentAt: string;
}

export interface ClientRoomView {
  role: "client";
  code: string;
  psychologistName: string | null;
  positions: PositionKey[];
  choiceMode: "down" | "up";
  /** Position being filled now; null when the spread is complete. */
  current: number | null;
  held: RoomCard | null;
  confirmed: (RoomCard | null)[];
  /** Face-up mode: open cards to choose from. */
  choices: RoomCard[];
  pauseAt: string | null;
  psychologistOnline: boolean;
  videoUrl: string | null;
  showReturns: boolean;
  ended: boolean;
  summary: SessionSummaryView | null;
}

export interface PsychologistCard extends RoomCard {
  questions: { index: number; text: string }[];
}

/** Only confirmed cards and the return count (spec §4). */
export interface PsychologistRoomView {
  role: "psychologist";
  id: string;
  code: string;
  clientLabel: string;
  positions: PositionKey[];
  choiceMode: "down" | "up";
  includeShadow: boolean;
  questionLanguage: Locale;
  expiresAt: string;
  pinRequired: boolean;
  videoUrl: string | null;
  clientJoined: boolean;
  clientOnline: boolean;
  confirmed: (PsychologistCard | null)[];
  returns: number | null;
  pauseAt: string | null;
  notes: string;
  ended: boolean;
  summary: SessionSummaryView | null;
}

export type RoomView = ClientRoomView | PsychologistRoomView;
