#!/usr/bin/env node
/**
 * Aplica migration 0019 (remove processo de revisão).
 * Uso: npm run db:migrate-remove-revision
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, "../src/db/migrations/0019_remove_revision.sql");

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

const { rows: cols } = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'measurements'
    AND column_name IN ('revision_reason', 'revision_from_etapa')
`);

if (cols.length === 0) {
  console.log("Migration 0019 já aplicada (colunas de revisão ausentes).");
} else {
  const raw = readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(";")
    .map((s) => s.replace(/^--[^\n]*\n/gm, "").trim())
    .filter(Boolean);

  console.log("Aplicando remoção de revisão…");
  for (const stmt of statements) {
    console.log("Executando:", stmt.split("\n")[0].slice(0, 80));
    await client.query(stmt);
  }
  console.log("Migration 0019 aplicada.");
}

await client.end();

console.log("Sincronizando registro Drizzle…");
const sync = spawnSync(
  process.execPath,
  ["--env-file=.env.local", join(__dirname, "db-sync-drizzle-journal.mjs")],
  { stdio: "inherit", cwd: join(__dirname, "..") },
);
process.exit(sync.status ?? 0);
