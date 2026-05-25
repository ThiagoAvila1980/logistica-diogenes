#!/usr/bin/env node
/**
 * Aplica migration 0016 (remove service_orders, centraliza measurements).
 * Uso: node --env-file=.env.local scripts/db-apply-remove-service-orders.mjs
 */
import crypto from "node:crypto";
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../src/db/migrations");
const sqlPath = join(migrationsDir, "0016_remove_service_orders.sql");
const journalPath = join(migrationsDir, "meta/_journal.json");

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DIRECT_URL ou DATABASE_URL em .env.local");
  process.exit(1);
}

const raw = readFileSync(sqlPath, "utf8");
const journal = JSON.parse(readFileSync(journalPath, "utf8"));

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

try {
  const { rows: existing } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cutting_plans'
      AND column_name = 'id_medicao'
  `);

  if (existing.length > 0) {
    console.log("Migration 0016 já aplicada (cutting_plans.id_medicao existe).");
  } else {
    console.log("Aplicando migration 0016...");
    await client.query(raw);
    console.log("Migration 0016 aplicada com sucesso.");
  }

  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const { rows: applied } = await client.query(
    `SELECT hash FROM drizzle.__drizzle_migrations`,
  );
  const appliedHashes = new Set(applied.map((row) => row.hash));

  for (const entry of journal.entries) {
    const migrationPath = join(migrationsDir, `${entry.tag}.sql`);
    const query = readFileSync(migrationPath, "utf8");
    const hash = crypto.createHash("sha256").update(query).digest("hex");

    if (appliedHashes.has(hash)) continue;

    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when],
    );
    console.log(`Registrada no Drizzle: ${entry.tag}`);
  }

  const { rows: cols } = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'cutting_plans' AND column_name = 'id_medicao')
        OR (table_name = 'notifications' AND column_name = 'measurement_id')
        OR (table_name = 'measurements' AND column_name = 'number')
      )
    ORDER BY table_name, column_name
  `);

  console.log(
    "Colunas-chave:",
    cols.map((row) => `${row.table_name}.${row.column_name}`).join(", "),
  );

  const { rows: dropped } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'service_orders'
    ) AS exists
  `);
  console.log("service_orders removida:", dropped[0]?.exists ? "não" : "sim");
} finally {
  await client.end();
}
