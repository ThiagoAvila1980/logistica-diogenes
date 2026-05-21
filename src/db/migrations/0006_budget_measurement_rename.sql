-- Renomeia enums para refletir o domínio: medição de orçamento (sem visita em campo)
ALTER TYPE "public"."measurement_types" RENAME VALUE 'inicial' TO 'orcamento';
--> statement-breakpoint
ALTER TYPE "public"."os_status" RENAME VALUE 'medicao_inicial' TO 'medicao_orcamento';
--> statement-breakpoint
ALTER TABLE "service_orders" ALTER COLUMN "status" SET DEFAULT 'medicao_orcamento';
