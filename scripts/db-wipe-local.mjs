/**
 * Apaga TODAS as linhas de TODAS as tabelas do schema public do banco LOCAL (dev).
 * Mantém a estrutura das tabelas e o histórico de migrations.
 *
 * Uso: node --env-file=.env.local scripts/db-wipe-local.mjs
 *
 * Guard: aborta se DATABASE_URL não apontar para localhost / 127.0.0.1.
 */
import postgres from "postgres";
import { getDatabaseUrlFromEnv, postgresSslOption } from "./db-url.mjs";

const url = getDatabaseUrlFromEnv();

let host = "";
try {
  host = new URL(url).hostname;
} catch {
  console.error("DATABASE_URL inválida.");
  process.exit(1);
}

if (host !== "localhost" && host !== "127.0.0.1") {
  console.error(
    `ABORTADO: DATABASE_URL aponta para "${host}", não para o banco local. Nada foi alterado.`,
  );
  process.exit(1);
}

const sql = postgres(url, {
  prepare: false,
  ssl: postgresSslOption(url),
  max: 1,
  connect_timeout: 15,
});

try {
  const tables = await sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('__drizzle_migrations')
    ORDER BY tablename
  `;

  if (tables.length === 0) {
    console.log("Nenhuma tabela encontrada no schema public.");
  } else {
    const names = tables.map((t) => t.tablename);
    console.log(`Truncando ${names.length} tabelas: ${names.join(", ")}`);

    const identifiers = names
      .map((n) => `"public"."${n.replaceAll('"', '""')}"`)
      .join(", ");

    await sql.unsafe(
      `TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`,
    );

    console.log(`OK — ${names.length} tabelas truncadas.`);

    const remaining = [];
    for (const n of names) {
      const [{ count }] = await sql.unsafe(
        `SELECT COUNT(*)::int AS count FROM "public"."${n.replaceAll('"', '""')}"`,
      );
      if (count !== 0) remaining.push(`${n}=${count}`);
    }
    console.log(
      remaining.length
        ? `ATENÇÃO — ainda com dados: ${remaining.join(", ")}`
        : "Verificado: todas as tabelas estão vazias.",
    );
  }
} finally {
  await sql.end();
}
