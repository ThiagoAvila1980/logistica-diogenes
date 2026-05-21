/**
 * URLs de conexão Supabase.
 *
 * - DATABASE_URL: pooler (porta 6543) — uso em runtime (Server Actions, API)
 * - DIRECT_URL: conexão direta (porta 5432) — migrations e seed
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Copie a connection string do Supabase (Session pooler) para .env.local",
    );
  }
  return url;
}

export function getDirectDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;
  throw new Error(
    "DIRECT_URL ou DATABASE_URL não configurada. Copie .env.example para .env.local e preencha a connection string do Supabase.",
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
