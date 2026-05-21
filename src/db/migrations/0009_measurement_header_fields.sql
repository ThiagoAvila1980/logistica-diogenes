ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "cliente" varchar(255);
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "telefone" varchar(20);
ALTER TABLE "measurements" ADD COLUMN IF NOT EXISTS "numero_orcamento" varchar(64);
