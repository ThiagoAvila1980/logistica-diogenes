-- Suporte a sincronização offline para medições
-- client_updated_at: timestamp do dispositivo cliente — usado para resolução de conflitos (last-write-wins)
-- device_id: identificador do dispositivo de origem — rastreabilidade de syncs

ALTER TABLE measurements
  ADD COLUMN IF NOT EXISTS client_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(128);

-- Índice para consultas de resolução de conflito
CREATE INDEX IF NOT EXISTS idx_measurements_client_updated_at
  ON measurements (client_updated_at)
  WHERE client_updated_at IS NOT NULL;
