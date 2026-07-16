CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"measurement_id" uuid,
	"item_id" text,
	"entity_type" text,
	"entity_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_measurement_id_measurements_id_fk" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_events_measurement_created" ON "audit_events" USING btree ("measurement_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_actor_created" ON "audit_events" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_action_created" ON "audit_events" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_events_entity" ON "audit_events" USING btree ("entity_type","entity_id");