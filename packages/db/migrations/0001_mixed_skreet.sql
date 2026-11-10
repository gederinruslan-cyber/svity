CREATE TABLE "cards" (
	"id" integer PRIMARY KEY NOT NULL,
	"image_key" text,
	"tone" text DEFAULT 'neutral' NOT NULL,
	"is_resource" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_draws" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_flip_at" timestamp with time zone NOT NULL,
	"next_available_at" timestamp with time zone NOT NULL,
	"cards_seen" integer[] NOT NULL,
	"repicks_left" smallint NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"question_index" smallint NOT NULL,
	"feeling_before" text NOT NULL,
	"request_text" text
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"draw_id" uuid,
	"card_id" integer NOT NULL,
	"question_index" smallint NOT NULL,
	"request_text" text,
	"feeling_before" text NOT NULL,
	"feeling_after" text NOT NULL,
	"note" text,
	"is_shadow" boolean DEFAULT false NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'daily' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "login_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "login_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"card_id" integer NOT NULL,
	"index" smallint NOT NULL,
	"text" jsonb NOT NULL,
	"tone" text DEFAULT 'neutral' NOT NULL,
	"needs_request" boolean DEFAULT false NOT NULL,
	CONSTRAINT "questions_card_id_index_pk" PRIMARY KEY("card_id","index")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'personal' NOT NULL,
	"locale" text NOT NULL,
	"address_form" text DEFAULT 'n' NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "daily_draws" ADD CONSTRAINT "daily_draws_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_draw_id_daily_draws_id_fk" FOREIGN KEY ("draw_id") REFERENCES "public"."daily_draws"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_draws_user_flip" ON "daily_draws" USING btree ("user_id","first_flip_at");--> statement-breakpoint
CREATE INDEX "entries_user_created" ON "entries" USING btree ("user_id","created_at");