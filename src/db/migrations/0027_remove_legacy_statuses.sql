-- 0027 — Remove os valores legados do enum os_status.
--
-- Estratégia: normaliza os registros legados para o pipeline atual,
-- recria o tipo os_status sem os valores antigos e converte as colunas.
-- Tudo dentro de uma transação: se qualquer passo falhar, faz rollback
-- total e nada fica pela metade. Faça backup antes mesmo assim.

BEGIN;

-- 1) Normaliza measurements.etapa (legado -> pipeline atual)
UPDATE "measurements" SET "etapa" = 'medicao_orcamento' WHERE "etapa" IN ('orcamento_enviado', 'aprovado_cliente');
UPDATE "measurements" SET "etapa" = 'cortes' WHERE "etapa" IN ('os_gerada', 'em_corte');
UPDATE "measurements" SET "etapa" = 'embalagem' WHERE "etapa" = 'corte_concluido';
UPDATE "measurements" SET "etapa" = 'transporte_perfil' WHERE "etapa" = 'em_transporte';
UPDATE "measurements" SET "etapa" = 'transporte_levar_vidro' WHERE "etapa" = 'transporte_entregue';
UPDATE "measurements" SET "etapa" = 'instalacao_vidros' WHERE "etapa" = 'instalacao_final';

-- 2) Normaliza status_history.from_status
UPDATE "status_history" SET "from_status" = 'medicao_orcamento' WHERE "from_status" IN ('orcamento_enviado', 'aprovado_cliente');
UPDATE "status_history" SET "from_status" = 'cortes' WHERE "from_status" IN ('os_gerada', 'em_corte');
UPDATE "status_history" SET "from_status" = 'embalagem' WHERE "from_status" = 'corte_concluido';
UPDATE "status_history" SET "from_status" = 'transporte_perfil' WHERE "from_status" = 'em_transporte';
UPDATE "status_history" SET "from_status" = 'transporte_levar_vidro' WHERE "from_status" = 'transporte_entregue';
UPDATE "status_history" SET "from_status" = 'instalacao_vidros' WHERE "from_status" = 'instalacao_final';

-- 3) Normaliza status_history.to_status
UPDATE "status_history" SET "to_status" = 'medicao_orcamento' WHERE "to_status" IN ('orcamento_enviado', 'aprovado_cliente');
UPDATE "status_history" SET "to_status" = 'cortes' WHERE "to_status" IN ('os_gerada', 'em_corte');
UPDATE "status_history" SET "to_status" = 'embalagem' WHERE "to_status" = 'corte_concluido';
UPDATE "status_history" SET "to_status" = 'transporte_perfil' WHERE "to_status" = 'em_transporte';
UPDATE "status_history" SET "to_status" = 'transporte_levar_vidro' WHERE "to_status" = 'transporte_entregue';
UPDATE "status_history" SET "to_status" = 'instalacao_vidros' WHERE "to_status" = 'instalacao_final';

-- 4) Recria o enum sem os valores legados
ALTER TYPE "os_status" RENAME TO "os_status_old";

CREATE TYPE "os_status" AS ENUM (
  'medicao_orcamento', 'medicao_final', 'cortes', 'embalagem', 'acessorios_plano',
  'transporte_perfil', 'transporte_estrutural', 'transporte_perfis_total',
  'transporte_acessorios', 'transporte_levar_vidro',
  'instalacao_estrutural', 'instalacao_vidros', 'concluido'
);

-- 5) Converte as colunas para o novo tipo
ALTER TABLE "measurements" ALTER COLUMN "etapa" DROP DEFAULT;
ALTER TABLE "measurements" ALTER COLUMN "etapa" TYPE "os_status" USING "etapa"::text::"os_status";
ALTER TABLE "measurements" ALTER COLUMN "etapa" SET DEFAULT 'medicao_final';

ALTER TABLE "status_history" ALTER COLUMN "from_status" TYPE "os_status" USING "from_status"::text::"os_status";
ALTER TABLE "status_history" ALTER COLUMN "to_status" TYPE "os_status" USING "to_status"::text::"os_status";

-- 6) Remove o tipo antigo
DROP TYPE "os_status_old";

COMMIT;
