#!/usr/bin/env node
/**
 * Aplica a migration 0035_performance_scoring manualmente.
 * Cria o enum work_event_type, a tabela scoring_rules (com seed de pontos padrão)
 * e a tabela work_events (ledger de eventos de trabalho pontuados).
 */
import pg from "pg";

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DIRECT_URL ou DATABASE_URL em .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

try {
  console.log("Criando enum work_event_type...");
  await client.query(`
    DO $$ BEGIN
      CREATE TYPE work_event_type AS ENUM (
        'corte_vao',
        'transporte_vao',
        'instalacao_vao',
        'medicao'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$
  `);

  console.log("Criando tabela scoring_rules...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS scoring_rules (
      event_type work_event_type PRIMARY KEY,
      points     INTEGER         NOT NULL DEFAULT 10,
      active     BOOLEAN         NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Inserindo pontuações padrão...");
  await client.query(`
    INSERT INTO scoring_rules (event_type, points, active) VALUES
      ('corte_vao',       10, true),
      ('transporte_vao',  15, true),
      ('instalacao_vao',  20, true),
      ('medicao',         10, true)
    ON CONFLICT (event_type) DO NOTHING
  `);

  console.log("Criando tabela work_events...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS work_events (
      id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id        UUID            NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
      measurement_id UUID            NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
      item_id        TEXT            NOT NULL,
      event_type     work_event_type NOT NULL,
      points         INTEGER         NOT NULL,
      created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Criando índices...");
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_work_events_unique
      ON work_events (measurement_id, item_id, event_type)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_work_events_user_id
      ON work_events (user_id)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_work_events_created_at
      ON work_events (created_at)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_work_events_user_created
      ON work_events (user_id, created_at)
  `);

  console.log("\n✓ Migration 0035_performance_scoring aplicada com sucesso.");
  console.log("Execute 'npm run db:migration-status' para confirmar.");
} catch (err) {
  console.error("Erro ao aplicar migration:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
