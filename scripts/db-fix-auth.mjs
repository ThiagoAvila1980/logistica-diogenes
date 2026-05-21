/**
 * Aplica migrations pendentes (auth + veículos) e define senha demo nos usuários sem hash.
 * Uso: node --env-file=.env.local scripts/db-fix-auth.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import postgres from "postgres";

const scryptAsync = promisify(scrypt);
const DEMO_PASSWORD = "demo123";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "src", "db", "migrations");

function getDirectUrl() {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL ou DIRECT_URL não configurada");
  return url;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString("hex")}`;
}

async function runSqlFile(sql, filePath) {
  console.log(`→ ${filePath.split(/[/\\]/).pop()}`);
  await sql.unsafe(readFileSync(filePath, "utf8"));
}

async function main() {
  const url = getDirectUrl();
  const sql = postgres(url, {
    prepare: false,
    ssl: url.includes("supabase") ? "require" : undefined,
    max: 1,
  });

  try {
    await runSqlFile(
      sql,
      join(migrationsDir, "0002_user_password_hash.sql"),
    );
    await runSqlFile(sql, join(migrationsDir, "0003_vehicles.sql"));

    const hash = await hashPassword(DEMO_PASSWORD);
    const updated = await sql`
      UPDATE users
      SET password_hash = ${hash}, updated_at = NOW()
      WHERE password_hash IS NULL
      RETURNING email
    `;

    console.log(`✅ password_hash aplicado. ${updated.length} usuário(s) com senha "${DEMO_PASSWORD}":`);
    for (const row of updated) {
      console.log(`   - ${row.email}`);
    }

    if (updated.length === 0) {
      const [{ count }] = await sql`
        SELECT count(*)::int AS count FROM users WHERE password_hash IS NOT NULL
      `;
      console.log(`ℹ️  ${count} usuário(s) já tinham senha definida.`);
    }
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((err) => {
  console.error("❌ Falha:", err.message ?? err);
  process.exit(1);
});
