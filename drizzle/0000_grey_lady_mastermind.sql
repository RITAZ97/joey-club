CREATE TYPE "public"."resource_status" AS ENUM('candidate', 'approved', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('approved', 'rejected', 'needs_changes');--> statement-breakpoint
CREATE TABLE "resource_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"decision" "review_decision" NOT NULL,
	"notes" text,
	"reviewer_id" text NOT NULL,
	"ai_assisted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"canonical_url" text NOT NULL,
	"thumbnail_url" text,
	"age_stage" text NOT NULL,
	"setting" text NOT NULL,
	"max_children" text,
	"activity_type" text NOT NULL,
	"topic" text NOT NULL,
	"eylf_outcome" text NOT NULL,
	"learning_area" text NOT NULL,
	"format" text NOT NULL,
	"materials" text,
	"steps_summary" text,
	"metadata" jsonb,
	"status" "resource_status" DEFAULT 'candidate' NOT NULL,
	"verified_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"allowed_domains" text[] NOT NULL,
	"source_type" text NOT NULL,
	"deep_links_only" boolean DEFAULT false NOT NULL,
	"requires_manual_review" boolean DEFAULT true NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_reviews" ADD CONSTRAINT "resource_reviews_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resource_reviews_resource_id_index" ON "resource_reviews" USING btree ("resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resources_canonical_url_unique" ON "resources" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "resources_status_index" ON "resources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resources_source_id_index" ON "resources" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_slug_unique" ON "sources" USING btree ("slug");