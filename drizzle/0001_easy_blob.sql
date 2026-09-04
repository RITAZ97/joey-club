ALTER TYPE "public"."resource_status" ADD VALUE 'needs_review' BEFORE 'approved';--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "review_confidence" integer;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "review_reason" text;