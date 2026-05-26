import postgres from "postgres";
import {
  getDatabaseUrlFromEnv,
  getDirectDatabaseUrlFromEnv,
  postgresSslOption,
} from "./db-url.mjs";

function getDatabaseUrl() {
  return getDatabaseUrlFromEnv();
}

function getDirectDatabaseUrl() {
  return getDirectDatabaseUrlFromEnv();
}

function describeUrl(label, url) {
  try {
    const parsed = new URL(url);
    console.log(
      `${label}: user=${parsed.username} host=${parsed.hostname} port=${parsed.port || 5432}`,
    );
  } catch {
    console.log(`${label}: URL inválida`);
  }
}

async function pingOnce(label, url) {
  const sql = postgres(url, {
    prepare: false,
    ssl: postgresSslOption(url),
    max: 1,
    connect_timeout: 10,
  });

  try {
    const [row] = await sql`select current_user as user, 1 as ok`;
    console.log(`✅ ${label}: conectado como ${row.user}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${label}: ${message}`);
    return false;
  } finally {
    await sql.end({ timeout: 1 }).catch(() => {});
  }
}

async function pingWithRetry(label, url, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const ok = await pingOnce(`${label}${attempt > 1 ? ` (tentativa ${attempt})` : ""}`, url);
    if (ok) return true;
    if (attempt < attempts) {
      const waitMs = attempt * 3000;
      console.log(`⏳ aguardando ${waitMs / 1000}s antes de tentar novamente...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
  return false;
}

describeUrl("DATABASE_URL", getDatabaseUrl());
describeUrl("DIRECT_URL", getDirectDatabaseUrl());
console.log("");

const runtimeOk = await pingWithRetry("DATABASE_URL", getDatabaseUrl());
const directOk = await pingWithRetry("DIRECT_URL", getDirectDatabaseUrl());

if (!runtimeOk || !directOk) {
  console.error(
    "\nFalha ao conectar ao PostgreSQL.\n\n" +
      "Docker / Coolify:\n" +
      "1. localhost dentro do container não alcança Postgres em outro container ou no host\n" +
      "2. Use o hostname interno do Postgres (nome do serviço no Coolify)\n" +
      "3. Variáveis DATABASE_URL / DIRECT_URL no Runtime do app, não só no build\n" +
      "4. Rode migrate no start/pós-deploy: npm run db:migrate:prod && npm run start\n\n" +
      "PostgreSQL no mesmo host (sem Docker):\n" +
      "1. Confirme que o serviço está rodando (porta 5432)\n" +
      "2. DATABASE_URL e DIRECT_URL apontando para o host correto\n" +
      "3. Remova ?schema=public da URL (só funciona no Prisma)\n",
  );
  process.exit(1);
}
