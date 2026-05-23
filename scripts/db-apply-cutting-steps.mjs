#!/usr/bin/env node
/**
 * Aplica migration 0014 (colunas de checklist de corte).
 * Uso: node --env-file=.env.local scripts/db-apply-cutting-steps.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "../src/db/migrations/0014_cutting_steps.sql");

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DIRECT_URL ou DATABASE_URL em .env.local");
  process.exit(1);
}

const raw = readFileSync(sqlPath, "utf8");
const statements = raw
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

await client.connect();

for (const stmt of statements) {
  console.log("Executando:", stmt.slice(0, 80) + "...");
  await client.query(stmt);
}

const { rows } = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'cutting_plans'
    AND column_name IN ('corte_feito', 'embalagem_feita', 'acessorios_feitos')
  ORDER BY column_name
`);

console.log("Colunas criadas:", rows.map((r) => r.column_name).join(", "));
await client.end();
