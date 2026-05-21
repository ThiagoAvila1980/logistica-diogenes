import postgres from "postgres";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL não configurada");
  return url;
}

function getDirectDatabaseUrl() {
  return process.env.DIRECT_URL?.trim() || getDatabaseUrl();
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
    ssl: url.includes("supabase") ? "require" : undefined,
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
    "\nO formato da URL parece correto, mas o pooler rejeitou a senha.\n" +
      "Isso é um bug conhecido do Supabase após reset de senha (região aws-1-us-west-2).\n\n" +
      "Tente nesta ordem:\n" +
      "1. Dashboard > Project Settings > General > Restart project\n" +
      "2. Dashboard > Database > Reset database password\n" +
      "3. Copie a connection string COMPLETA (não só a senha) para .env.local\n" +
      "4. Use senha só com letras e números (sem @, #, &, etc.)\n" +
      "5. Aguarde 2-5 minutos e rode npm run db:ping novamente\n\n" +
      "Enquanto isso, o banco continua acessível via MCP no Cursor.",
  );
  process.exit(1);
}
