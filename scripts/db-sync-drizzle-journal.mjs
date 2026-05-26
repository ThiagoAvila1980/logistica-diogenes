#!/usr/bin/env node
/**
 * Sincroniza drizzle.__drizzle_migrations com o journal local.
 *
 * Use após aplicar SQL manualmente (scripts db-apply-*) para que
 * db:migrate reconheça migrations já executadas.
 *
 * Uso:
 *   npm run db:sync-drizzle-journal           # registra hashes faltantes (SQL já aplicado)
 *   npm run db:sync-drizzle-journal -- --apply # executa SQL pendente e registra
 */
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../src/db/migrations");
const journalPath = join(migrationsDir, "meta/_journal.json");
const applyPending = process.argv.includes("--apply");

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Defina DIRECT_URL ou DATABASE_URL em .env.local");
  process.exit(1);
}

const journal = JSON.parse(readFileSync(journalPath, "utf8"));

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});

function readSql(tag) {
  return readFileSync(join(migrationsDir, `${tag}.sql`), "utf8");
}

function hashForSql(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

function splitStatements(raw) {
  if (raw.includes("--> statement-breakpoint")) {
    return raw
      .split("--> statement-breakpoint")
      .map((s) => s.replace(/^--[^\n]*\n/gm, "").trim())
      .filter(Boolean);
  }
  return raw
    .split(";")
    .map((s) => s.replace(/^--[^\n]*\n/gm, "").trim())
    .filter(Boolean);
}

await client.connect();

try {
  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const { rows: dbRows } = await client.query(`
    SELECT hash, created_at::text AS created_at
    FROM drizzle.__drizzle_migrations
  `);
  const appliedHashes = new Set(dbRows.map((row) => row.hash));
  let nextCreatedAt =
    dbRows.reduce((max, row) => Math.max(max, Number(row.created_at)), 0) + 1;

  for (const entry of journal.entries) {
    const sql = readSql(entry.tag);
    const hash = hashForSql(sql);

    if (appliedHashes.has(hash)) {
      console.log(`OK  ${entry.tag}`);
      continue;
    }

    if (applyPending) {
      console.log(`APL ${entry.tag} — executando SQL...`);
      for (const stmt of splitStatements(sql)) {
        await client.query(stmt);
      }
    } else {
      console.log(`REG ${entry.tag} — registrando hash (SQL assumido já aplicado)`);
    }

    await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
      [hash, nextCreatedAt],
    );
    appliedHashes.add(hash);
    console.log(`    created_at=${nextCreatedAt}`);
    nextCreatedAt += 1;
  }

  console.log("\nSincronização concluída. Valide com: npm run db:migration-status");
} finally {
  await client.end();
}
