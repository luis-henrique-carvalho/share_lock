ALTER TABLE "lead" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "verification_token" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "verification_token_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_verification_token" ON "lead" USING btree ("verification_token");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_verification_token_unique" UNIQUE("verification_token");