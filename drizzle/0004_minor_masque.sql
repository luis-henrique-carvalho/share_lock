CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'converted');--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "status" "lead_status" DEFAULT 'new' NOT NULL;