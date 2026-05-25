#!/usr/bin/env node
/**
 * Aplica migration 0017 (specs por item de desenho).
 * Uso: node --env-file=.env.local scripts/db-apply-item-spec-fields.mjs
 */
import crypto from "node:crypto";
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../src/db/migrations");
const sqlPath = join(migrationsDir, "0017_item_spec_fields.sql");
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
      AND table_name = 'measurements'
      AND column_name = 'id_cor'
  `);

  if (existing.length === 0) {
    console.log("Migration 0017 já aplicada (measurements.id_cor removida).");
  } else {
    console.log("Aplicando migration 0017...");
    await client.query(raw);
    console.log("Migration 0017 aplicada com sucesso.");
  }

  const entry = journal.entries.find((e) => e.tag === "0017_item_spec_fields");
  if (entry) {
    const query = readFileSync(sqlPath, "utf8");
    const hash = crypto.createHash("sha256").update(query).digest("hex");
    const { rows } = await client.query(
      `SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = $1`,
      [hash],
    );
    if (rows.length === 0) {
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [hash, entry.when],
      );
      console.log("Registrada no Drizzle: 0017_item_spec_fields");
    }
  }
} finally {
  await client.end();
}
