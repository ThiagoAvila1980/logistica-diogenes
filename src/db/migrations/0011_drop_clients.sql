-- Dados de cliente passam a ficar na medição (measurements.cliente / telefone)
UPDATE "measurements" m
SET
  "cliente" = COALESCE(NULLIF(TRIM(m."cliente"), ''), c."name"),
  "telefone" = COALESCE(NULLIF(TRIM(m."telefone"), ''), c."phone")
FROM "service_orders" os
INNER JOIN "clients" c ON c."id" = os."client_id"
WHERE m."os_id" = os."id";--> statement-breakpoint
ALTER TABLE "service_orders" DROP CONSTRAINT IF EXISTS "service_orders_client_id_clients_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_os_client";--> statement-breakpoint
ALTER TABLE "service_orders" DROP COLUMN "client_id";--> statement-breakpoint
DROP TABLE IF EXISTS "clients" CASCADE;
