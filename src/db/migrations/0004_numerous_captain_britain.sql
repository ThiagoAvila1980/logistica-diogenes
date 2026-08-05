ALTER TABLE "measurements" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_meas_archived_at" ON "measurements" USING btree ("archived_at");
