-- Adiciona sub-etapas de transporte como booleanos independentes
-- Cada etapa é desbloqueada por um gate (cutting step correspondente)
ALTER TABLE "transport_logs"
  ADD COLUMN IF NOT EXISTS "levar_perfil_estrutural"  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "levar_perfis_total"        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "levar_acessorios"          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "levar_vidro"               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "transporte_concluido"      boolean NOT NULL DEFAULT false;

-- Adiciona sub-etapas de instalação como booleanos independentes
-- Cada etapa é desbloqueada quando o transporte correspondente é concluído
ALTER TABLE "installation_logs"
  ADD COLUMN IF NOT EXISTS "instalacao_estrutural_feita" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "instalacao_vidros_feita"     boolean NOT NULL DEFAULT false;
