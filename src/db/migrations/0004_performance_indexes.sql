-- Índices de performance (consultas reais do app)
CREATE INDEX IF NOT EXISTS "idx_os_updated_at" ON "service_orders" USING btree ("updated_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_os_status_updated" ON "service_orders" USING btree ("status", "updated_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_os_assigned_status" ON "service_orders" USING btree ("assigned_user_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_os_status_assigned" ON "service_orders" USING btree ("status", "assigned_user_id");
--> statement-breakpoint
-- FKs sem índice (Supabase advisor)
CREATE INDEX IF NOT EXISTS "idx_cut_operator" ON "cutting_plans" USING btree ("operator_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotes_created_by" ON "quotes" USING btree ("created_by_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_status_history_changed_by" ON "status_history" USING btree ("changed_by_id");
--> statement-breakpoint
-- Índices duplicados (mantém constraint UNIQUE nativa)
DROP INDEX IF EXISTS "idx_os_number";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_sla_status";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_passkeys_credential";
