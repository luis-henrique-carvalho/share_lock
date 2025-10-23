ALTER TABLE "campaign" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "referral_code" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_campaign_slug" ON "campaign" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_lead_referral_code" ON "lead" USING btree ("referral_code","campaign_id");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_referral_code_unique" UNIQUE("referral_code");