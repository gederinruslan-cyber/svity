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
  role: text("role", { enum: ["personal", "professional"] }).notNull().default("personal"),
  locale: text("locale").notNull(),
  /** Only for grammatical forms (spec §5): f · m · n. */
  addressForm: text("address_form", { enum: ["f", "m", "n"] }).notNull().default("n"),
  /** IANA zone; the daily-card timer runs in it (spec §6). */
  timezone: text("timezone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time e-mail sign-in links. Only the SHA-256 of the token is stored. */
export const loginTokens = pgTable("login_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
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
