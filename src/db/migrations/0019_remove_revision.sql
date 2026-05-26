-- Remove processo de revisão: migra dados, colunas e valor do enum os_status

UPDATE "measurements"
SET "etapa" = COALESCE("revision_from_etapa", 'medicao_final')
WHERE "etapa" = 'revisao';

UPDATE "status_history"
SET "from_status" = COALESCE(
  (SELECT "revision_from_etapa" FROM "measurements" WHERE "measurements"."id" = "status_history"."measurement_id"),
  'medicao_final'
)
WHERE "from_status" = 'revisao';

UPDATE "status_history"
SET "to_status" = COALESCE(
  (SELECT "revision_from_etapa" FROM "measurements" WHERE "measurements"."id" = "status_history"."measurement_id"),
  'medicao_final'
)
WHERE "to_status" = 'revisao';

ALTER TABLE "measurements" DROP COLUMN IF EXISTS "revision_reason";
ALTER TABLE "measurements" DROP COLUMN IF EXISTS "revision_from_etapa";

ALTER TABLE "measurements" ALTER COLUMN "etapa" DROP DEFAULT;

CREATE TYPE "os_status_new" AS ENUM (
  'medicao_orcamento',
  'medicao_final',
  'cortes',
  'embalagem',
  'acessorios_plano',
  'transporte_perfil',
  'transporte_estrutural',
  'transporte_perfis_total',
  'transporte_acessorios',
  'transporte_levar_vidro',
  'instalacao_estrutural',
  'instalacao_vidros',
  'concluido',
  'orcamento_enviado',
  'aprovado_cliente',
  'os_gerada',
  'em_corte',
  'corte_concluido',
  'em_transporte',
  'transporte_entregue',
  'instalacao_final'
);

ALTER TABLE "measurements"
  ALTER COLUMN "etapa" TYPE "os_status_new"
  USING "etapa"::text::"os_status_new";

ALTER TABLE "status_history"
  ALTER COLUMN "from_status" TYPE "os_status_new"
  USING "from_status"::text::"os_status_new";

ALTER TABLE "status_history"
  ALTER COLUMN "to_status" TYPE "os_status_new"
  USING "to_status"::text::"os_status_new";

DROP TYPE "os_status";
ALTER TYPE "os_status_new" RENAME TO "os_status";

ALTER TABLE "measurements"
  ALTER COLUMN "etapa" SET DEFAULT 'medicao_final'::"os_status";
