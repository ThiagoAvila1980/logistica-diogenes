#!/usr/bin/env node
/**
 * Aplica migration 0011 (remove clients, OS vinculada à medição).
 * Uso: npm run db:migrate-drop-clients
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "../src/db/migrations/0011_drop_clients.sql");

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DIRECT_URL ou DATABASE_URL em .env.local");
  process.exit(1);
}

const raw = readFileSync(sqlPath, "utf8");
const statements = raw
  .split("--> statement-breakpoint")
  .map((s) => s.replace(/^--[^\n]*\n/gm, "").trim())
  .filter(Boolean);

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

const { rows } = await client.query(`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clients'
  ) AS exists
`);

if (!rows[0]?.exists) {
  console.log("✅ Tabela clients já removida — nada a fazer.");
  await client.end();
  process.exit(0);
}

console.log("Removendo cadastro de clientes (0011)…");

for (const statement of statements) {
  try {
    await client.query(statement);
    console.log("OK:", statement.split("\n")[0].slice(0, 72));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("does not exist")) {
      console.log("Skip:", msg);
      continue;
    }
    console.error("Erro:", msg);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("✅ Migration 0011 aplicada.");
