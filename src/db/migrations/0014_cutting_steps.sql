ALTER TABLE "cutting_plans" ADD COLUMN IF NOT EXISTS "corte_feito" boolean NOT NULL DEFAULT false;
ALTER TABLE "cutting_plans" ADD COLUMN IF NOT EXISTS "embalagem_feita" boolean NOT NULL DEFAULT false;
ALTER TABLE "cutting_plans" ADD COLUMN IF NOT EXISTS "acessorios_feitos" boolean NOT NULL DEFAULT false;
