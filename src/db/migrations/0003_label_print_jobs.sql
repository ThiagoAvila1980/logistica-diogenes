CREATE TYPE "public"."label_print_job_status" AS ENUM('pending', 'printing', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "label_print_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"measurement_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"raw" text NOT NULL,
	"status" "label_print_job_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_by_id" uuid,
	"claimed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "label_print_jobs" ADD CONSTRAINT "label_print_jobs_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_print_jobs" ADD CONSTRAINT "label_print_jobs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_label_print_jobs_status_created" ON "label_print_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_label_print_jobs_measurement" ON "label_print_jobs" USING btree ("measurement_id");
