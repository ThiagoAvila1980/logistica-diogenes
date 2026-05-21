#!/usr/bin/env node
/**
 * Aplica migration 0010 (users.role → users.roles[]) no Supabase.
 * Uso: npm run db:migrate-roles
 */
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(
  __dirname,
  "../src/db/migrations/0010_user_roles_array.sql",
);

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
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name IN ('role', 'roles')
`);

const hasRole = rows.some((r) => r.column_name === "role");
const hasRoles = rows.some((r) => r.column_name === "roles");

if (hasRoles && !hasRole) {
  console.log("✅ Coluna users.roles já existe — nada a fazer.");
  await client.end();
  process.exit(0);
}

if (!hasRole && !hasRoles) {
  console.error("❌ Tabela users sem colunas role/roles — verifique o banco.");
  await client.end();
  process.exit(1);
}

console.log("Aplicando múltiplos papéis por usuário (0010)…");

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
console.log("✅ Migration 0010 aplicada.");
