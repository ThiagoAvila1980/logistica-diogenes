#!/usr/bin/env node
/**
 * Aplica a migration 0034_role_screen_access manualmente.
 * Cria a tabela role_screen_access e insere os defaults.
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
  console.log("Criando tabela role_screen_access...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS "role_screen_access" (
      "role"       "user_roles"  NOT NULL,
      "screen"     TEXT          NOT NULL,
      "enabled"    BOOLEAN       NOT NULL DEFAULT false,
      "updated_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
      PRIMARY KEY ("role", "screen")
    )
  `);

  console.log("Inserindo defaults de acesso por papel...");
  await client.query(`
    INSERT INTO "role_screen_access" ("role", "screen", "enabled") VALUES
      ('gerente',   'production',   true),
      ('gerente',   'logistics',    true),
      ('gerente',   'installation', true),
      ('gerente',   'concluded',    true),
      ('gerente',   'dashboard',    false),
      ('gerente',   'field',        false),

      ('medidor',   'field',        true),
      ('medidor',   'production',   false),
      ('medidor',   'logistics',    false),
      ('medidor',   'installation', false),
      ('medidor',   'concluded',    false),
      ('medidor',   'dashboard',    false),

      ('cortador',  'production',   true),
      ('cortador',  'field',        false),
      ('cortador',  'logistics',    false),
      ('cortador',  'installation', false),
      ('cortador',  'concluded',    false),
      ('cortador',  'dashboard',    false),

      ('motorista', 'logistics',    true),
      ('motorista', 'field',        false),
      ('motorista', 'production',   false),
      ('motorista', 'installation', false),
      ('motorista', 'concluded',    false),
      ('motorista', 'dashboard',    false),

      ('instalador','installation', true),
      ('instalador','concluded',    true),
      ('instalador','field',        false),
      ('instalador','production',   false),
      ('instalador','logistics',    false),
      ('instalador','dashboard',    false)
    ON CONFLICT ("role", "screen") DO NOTHING
  `);

  console.log("Migration 0034_role_screen_access aplicada com sucesso.");
  console.log("Execute 'npm run db:migration-status' para confirmar.");
} catch (err) {
  console.error("Erro ao aplicar migration:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
