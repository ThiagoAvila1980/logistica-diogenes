-- Adiciona data agendada para instalação na tabela installation_logs
ALTER TABLE installation_logs
  ADD COLUMN IF NOT EXISTS scheduled_installation_date TIMESTAMPTZ;
