-- Sistema de pontuação por desempenho dos funcionários
-- Cada vez que um funcionário conclui um vão (corte, transporte, instalação) ou uma medição,
-- um evento é registrado nesta tabela com o snapshot de pontos configurado no momento.

-- Enum dos tipos de evento de trabalho pontuados
CREATE TYPE work_event_type AS ENUM (
  'corte_vao',
  'transporte_vao',
  'instalacao_vao',
  'medicao'
);

-- Configuração de pontos por tipo de evento (editável pelo admin)
CREATE TABLE scoring_rules (
  event_type work_event_type PRIMARY KEY,
  points     INTEGER         NOT NULL DEFAULT 10,
  active     BOOLEAN         NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Valores padrão — admin pode alterar pela tela de Configurações
INSERT INTO scoring_rules (event_type, points, active) VALUES
  ('corte_vao',       10, true),
  ('transporte_vao',  15, true),
  ('instalacao_vao',  20, true),
  ('medicao',         10, true);

-- Ledger append-only de eventos de trabalho por funcionário
CREATE TABLE work_events (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID            NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
  measurement_id UUID            NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  item_id        TEXT            NOT NULL,   -- ID do vão, ou '__os__' para eventos de OS inteira
  event_type     work_event_type NOT NULL,
  points         INTEGER         NOT NULL,   -- snapshot dos pontos no momento do registro
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Idempotência: impede duplicação do mesmo evento para (OS, vão, tipo)
CREATE UNIQUE INDEX idx_work_events_unique
  ON work_events (measurement_id, item_id, event_type);

-- Índices para relatórios por funcionário e por período
CREATE INDEX idx_work_events_user_id      ON work_events (user_id);
CREATE INDEX idx_work_events_created_at   ON work_events (created_at);
CREATE INDEX idx_work_events_user_created ON work_events (user_id, created_at);
