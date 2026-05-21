CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"plate" varchar(20) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vehicles_plate" ON "vehicles" USING btree ("plate");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_active" ON "vehicles" USING btree ("active");
--> statement-breakpoint
ALTER TABLE "transport_logs" ADD COLUMN IF NOT EXISTS "vehicle_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transport_logs" ADD CONSTRAINT "transport_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trans_vehicle" ON "transport_logs" USING btree ("vehicle_id");
