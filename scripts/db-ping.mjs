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
      "PostgreSQL local:\n" +
      "1. Confirme que o serviço está rodando (porta 5432)\n" +
      "2. DATABASE_URL e DIRECT_URL apontando para o mesmo host local\n" +
      "3. Remova ?schema=public da URL (só funciona no Prisma, não no postgres.js)\n\n" +
      "Supabase remoto:\n" +
      "1. Dashboard > Project Settings > General > Restart project\n" +
      "2. Copie a connection string completa para .env.local\n" +
      "3. Aguarde 2-5 minutos e rode npm run db:ping novamente",
  );
  process.exit(1);
}
