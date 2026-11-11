import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const waitlistEntries = pgTable("waitlist_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  locale: text("locale").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const betaApplications = pgTable("beta_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  specialization: text("specialization").notNull(),
  country: text("country").notNull(),
  usesCards: boolean("uses_cards").notNull(),
  message: text("message"),
  locale: text("locale").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- accounts ----------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  /** argon2id (PHC string). Null for accounts made before passwords: they set one via "Forgot password". */
  passwordHash: text("password_hash"),
  role: text("role", { enum: ["personal", "professional"] }).notNull().default("personal"),
  /** Shown to clients in rooms: "Olena invites you to a session". */
  displayName: text("display_name"),
  locale: text("locale").notNull(),
  /** Only for grammatical forms (spec §5): f · m · n. */
  addressForm: text("address_form", { enum: ["f", "m", "n"] }).notNull().default("n"),
  /** IANA zone; the daily-card timer runs in it (spec §6). */
  timezone: text("timezone").notNull(),
  /** Local time of the daily reminder ("09:00", "12:00", "20:00") or null for off. Delivery comes with the app. */
  reminderTime: text("reminder_time"),
  /** Spec §8.3: "I understand and want to try". Kept when shadows are switched off. */
  shadowConsentAt: timestamp("shadow_consent_at", { withTimezone: true }),
  /** null = off. */
  shadowMode: text("shadow_mode", { enum: ["on_request", "sometimes"] }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** "Forgot password" links. Only the SHA-256 of the token is stored; one use, 30 minutes. */
export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- deck ----------

const tone = (name: string) => text(name, { enum: ["light", "neutral", "shadow"] }).notNull().default("neutral");

export const cards = pgTable("cards", {
  /** Card number, 1–117. */
  id: integer("id").primaryKey(),
  /** File name in the private card-image store; null until the image is matched. */
  imageKey: text("image_key"),
  tone: tone("tone"),
  isResource: boolean("is_resource").notNull().default(false),
});

export const questions = pgTable(
  "questions",
  {
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    index: smallint("index").notNull(),
    text: jsonb("text").$type<Record<string, string>>().notNull(),
    tone: tone("tone"),
    needsRequest: boolean("needs_request").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.index] })],
);

// ---------- daily card and diary ----------

export const dailyDraws = pgTable(
  "daily_draws",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firstFlipAt: timestamp("first_flip_at", { withTimezone: true }).notNull(),
    nextAvailableAt: timestamp("next_available_at", { withTimezone: true }).notNull(),
    cardsSeen: integer("cards_seen").array().notNull(),
    repicksLeft: smallint("repicks_left").notNull(),
    status: text("status", { enum: ["open", "saved", "closed"] }).notNull().default("open"),
    /** Question shown for the current card. */
    questionIndex: smallint("question_index").notNull(),
    feelingBefore: text("feeling_before").notNull(),
    requestText: text("request_text"),
  },
  (t) => [index("daily_draws_user_flip").on(t.userId, t.firstFlipAt)],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    drawId: uuid("draw_id").references(() => dailyDraws.id, { onDelete: "set null" }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id),
    questionIndex: smallint("question_index").notNull(),
    requestText: text("request_text"),
    feelingBefore: text("feeling_before").notNull(),
    feelingAfter: text("feeling_after").notNull(),
    note: text("note"),
    isShadow: boolean("is_shadow").notNull().default(false),
    isFavorite: boolean("is_favorite").notNull().default(false),
    source: text("source", { enum: ["daily", "shadow", "session", "task"] }).notNull().default("daily"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (t) => [index("entries_user_created").on(t.userId, t.createdAt)],
);

/** A shadow card drawn with the separate button (spec §8). At most one per local day. */
export const shadowDraws = pgTable(
  "shadow_draws",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Local date in the profile time zone, YYYY-MM-DD. */
    day: text("day").notNull(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id),
    questionIndex: integer("question_index").notNull(),
    feelingBefore: text("feeling_before").notNull(),
    status: text("status", { enum: ["open", "saved", "closed"] }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("shadow_draws_user_day").on(t.userId, t.day)],
);

// ---------- rooms (spec §10) ----------

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short link code, e.g. 7KQ29F (shown as 7KQ-29F). */
    code: text("code").notNull().unique(),
    psychologistId: uuid("psychologist_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientLabel: text("client_label").notNull(),
    spread: smallint("spread").notNull().default(3),
    choiceMode: text("choice_mode", { enum: ["down", "up"] }).notNull().default("down"),
    includeShadow: boolean("include_shadow").notNull().default(false),
    questionLanguage: text("question_language").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    pinHash: text("pin_hash"),
    pinAttempts: smallint("pin_attempts").notNull().default(0),
    showReturns: boolean("show_returns").notNull().default(true),
    videoUrl: text("video_url"),
    /** SHA-256 of the client's room token (a guest has no account). */
    clientTokenHash: text("client_token_hash"),
    clientUserId: uuid("client_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [index("rooms_psychologist").on(t.psychologistId, t.createdAt)],
);

export const roomEvents = pgTable(
  "room_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["joined", "drawn", "returned", "confirmed", "pause", "ended"] }).notNull(),
    cardId: integer("card_id"),
    position: smallint("position"),
    method: text("method", { enum: ["button", "double_tap"] }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("room_events_room").on(t.roomId, t.at)],
);

/** Private to the psychologist. */
export const sessionNotes = pgTable("session_notes", {
  roomId: uuid("room_id")
    .primaryKey()
    .references(() => rooms.id, { onDelete: "cascade" }),
  text: text("text").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** "Session summary" sent to the client (spec §10.8); goes to their diary if they have an account. */
export const sessionSummaries = pgTable("session_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .unique()
    .references(() => rooms.id, { onDelete: "set null" }),
  clientUserId: uuid("client_user_id").references(() => users.id, { onDelete: "cascade" }),
  psychologistName: text("psychologist_name"),
  /** [{ position, cardId }] */
  cards: jsonb("cards").$type<{ position: "focus" | "is" | "blocks" | "helps"; cardId: number }[]>().notNull(),
  weekCardId: integer("week_card_id"),
  weekQuestionIndex: smallint("week_question_index"),
  language: text("language").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});
