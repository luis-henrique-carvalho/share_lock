CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid');--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_customer_id" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"provider_price_id" text NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"status" "subscription_status" NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "subscription_provider_subscription_id_unique" UNIQUE("provider_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_subscription_customer" ON "subscription" USING btree ("provider_customer_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_status" ON "subscription" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscription_provider" ON "subscription" USING btree ("provider");