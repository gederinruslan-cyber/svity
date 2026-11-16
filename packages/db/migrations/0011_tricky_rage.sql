ALTER TABLE "users" ALTER COLUMN "shadow_mode" SET DEFAULT 'sometimes';--> statement-breakpoint
UPDATE "users" SET "shadow_mode" = 'sometimes' WHERE "shadow_mode" IS NULL AND "shadow_consent_at" IS NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "shadow_consent_at";
