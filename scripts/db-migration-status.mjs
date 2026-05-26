#!/usr/bin/env node
/**
 * Diagnóstico do estado das migrations Drizzle.
 *
 * O drizzle-kit migrate só aplica entradas cujo `when` (journal) seja MAIOR
 * que o maior `created_at` em drizzle.__drizzle_migrations.
 *
 * Uso: npm run db:migration-status
 */
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../src/db/migrations");
const journalPath = join(migrationsDir, "meta/_journal.json");

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

function hashForTag(tag) {
  const sql = readFileSync(join(migrationsDir, `${tag}.sql`), "utf8");
  return crypto.createHash("sha256").update(sql).digest("hex");
}

await client.connect();

const { rows: dbRows } = await client.query(`
  SELECT hash, created_at::text AS created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at::bigint
`);

const appliedByHash = new Map(dbRows.map((row) => [row.hash, row.created_at]));
const maxCreatedAt = dbRows.reduce(
  (max, row) => Math.max(max, Number(row.created_at)),
  0,
);

console.log(`Migrations registradas no banco: ${dbRows.length}`);
console.log(`Maior created_at no banco: ${maxCreatedAt}\n`);

let prevWhen = 0;
const issues = [];

console.log("Tag                          | when (journal) | status");
console.log("-----------------------------|----------------|----------------------------------");

for (const entry of journal.entries) {
  const hash = hashForTag(entry.tag);
  const registered = appliedByHash.has(hash);
  const drizzleWouldRun = entry.when > maxCreatedAt;

  if (entry.when <= prevWhen) {
    issues.push(`${entry.tag}: when (${entry.when}) não é crescente em relação à entrada anterior (${prevWhen})`);
  }
  prevWhen = entry.when;

  let status;
  if (registered) {
    status = "registrada no banco";
  } else if (drizzleWouldRun) {
    status = "PENDENTE — db:migrate aplicaria";
  } else {
    status = "IGNORADA pelo db:migrate (when <= max created_at)";
  }

  console.log(
    `${entry.tag.padEnd(28)} | ${String(entry.when).padEnd(14)} | ${status}`,
  );
}

console.log("\n--- Arquivos .sql fora do journal ---");
const { readdirSync } = await import("node:fs");
const journalTags = new Set(journal.entries.map((e) => e.tag));
for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  const tag = file.replace(/\.sql$/, "");
  if (!journalTags.has(tag)) {
    console.log(`  ${tag} (aplicar via script db-apply-* ou incluir no journal)`);
  }
}

if (issues.length > 0) {
  console.log("\n--- Problemas no journal ---");
  for (const issue of issues) console.log(`  • ${issue}`);
}

console.log("\n--- Como corrigir ---");
console.log("1. Migrations já aplicadas manualmente: npm run db:sync-drizzle-journal");
console.log("2. Migrations pendentes com SQL novo: npm run db:sync-drizzle-journal -- --apply");
console.log("3. Depois de sincronizar: npm run db:migrate (deve ficar sem pendências)");

await client.end();
