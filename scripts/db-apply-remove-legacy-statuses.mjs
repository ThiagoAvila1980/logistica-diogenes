#!/usr/bin/env node
/**
 * Aplica migration 0027 (remove valores legados do enum os_status).
 * Uso: npm run db:migrate-remove-legacy
 *
 * ATENÇÃO: irreversível. Faça backup do banco antes de rodar em produção.
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(
  __dirname,
  "../src/db/migrations/0027_remove_legacy_statuses.sql",
);

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

const { rows: legacy } = await client.query(`
  SELECT 1
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE t.typname = 'os_status' AND e.enumlabel = 'em_corte'
  LIMIT 1
`);

if (legacy.length === 0) {
  console.log("Migration 0027 já aplicada (enum sem valores legados).");
} else {
  const raw = readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(";")
    .map((s) => s.replace(/^--[^\n]*\n/gm, "").trim())
    .filter(Boolean);

  console.log("Removendo valores legados do enum os_status…");
  for (const stmt of statements) {
    console.log("Executando:", stmt.split("\n")[0].slice(0, 80));
    await client.query(stmt);
  }
  console.log("Migration 0027 aplicada.");
}

await client.end();

console.log("Sincronizando registro Drizzle…");
const sync = spawnSync(
  process.execPath,
  ["--env-file=.env.local", join(__dirname, "db-sync-drizzle-journal.mjs")],
  { stdio: "inherit", cwd: join(__dirname, "..") },
);
process.exit(sync.status ?? 0);
