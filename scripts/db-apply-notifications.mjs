#!/usr/bin/env node
/**
 * Aplica migration 0015 (notificações push in-app).
 * Uso: node --env-file=.env.local scripts/db-apply-notifications.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "../src/db/migrations/0015_notifications.sql");

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
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) AS exists
`);

console.log("Tabela notifications:", rows[0]?.exists ? "ok" : "falhou");
await client.end();
