import { spawnSync } from "node:child_process";
import postgres from "postgres";
import {
  getDirectDatabaseUrlFromEnv,
  postgresSslOption,
} from "./db-url.mjs";

function describeTarget(url) {
  try {
    const parsed = new URL(url);
    const db = parsed.pathname.replace(/^\//, "") || "(default)";
    return {
      user: parsed.username || "(none)",
      host: parsed.hostname,
      port: parsed.port || "5432",
      database: db,
    };
  } catch {
    return null;
  }
}

function printDockerHints(target) {
  const isLocalhost =
    target?.host === "localhost" ||
    target?.host === "127.0.0.1" ||
    target?.host === "::1";

  console.error(
    "\n--- Dicas (Coolify / Docker) ---\n" +
      (isLocalhost
        ? "• localhost dentro do container NÃO alcança o Postgres do VPS nem outro container.\n" +
          "  Use o hostname interno do serviço Postgres no Coolify (ex.: nome do container).\n"
        : "") +
      "• DATABASE_URL / DIRECT_URL devem estar nas variáveis de AMBIENTE do app (Runtime).\n" +
      "• Rode migrate no START ou pós-deploy, não no build — o build muitas vezes não vê o banco.\n" +
      "• Teste antes: npm run db:ping:prod\n",
  );
}

let directUrl;
try {
  directUrl = getDirectDatabaseUrlFromEnv();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${message}`);
  console.error(
    "\nDefina DATABASE_URL (e opcionalmente DIRECT_URL) nas variáveis de ambiente do Coolify.",
  );
  process.exit(1);
}

const target = describeTarget(directUrl);
if (target) {
  console.log(
    `Migrate → user=${target.user} host=${target.host} port=${target.port} db=${target.database}`,
  );
} else {
  console.log("Migrate → DIRECT_URL configurada (formato não pôde ser exibido)");
}

const sql = postgres(directUrl, {
  prepare: false,
  ssl: postgresSslOption(directUrl),
  max: 1,
  connect_timeout: 10,
});

try {
  const [row] = await sql`select current_user as user, current_database() as db`;
  console.log(`✅ Conexão OK (${row.user} @ ${row.db})`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Não foi possível conectar antes do migrate: ${message}`);
  printDockerHints(target);
  process.exit(1);
} finally {
  await sql.end({ timeout: 1 }).catch(() => {});
}

console.log("\nAplicando migrations...\n");

const result = spawnSync(
  process.execPath,
  ["./node_modules/drizzle-kit/bin.cjs", "migrate"],
  { stdio: "inherit", env: process.env },
);

if (result.status !== 0) {
  printDockerHints(target);
  process.exit(result.status ?? 1);
}

console.log("\n✅ Migrations aplicadas.");
