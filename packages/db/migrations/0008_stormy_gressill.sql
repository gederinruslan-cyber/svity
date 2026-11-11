ALTER TABLE "beta_applications" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "beta_applications" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "beta_applications" ADD COLUMN "decided_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;