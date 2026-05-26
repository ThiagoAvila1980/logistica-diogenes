/** Parâmetros de Prisma/Drizzle que o driver postgres.js repassa como GUC inválido. */
const STRIP_SEARCH_PARAMS = new Set([
  "schema",
  "pgbouncer",
  "connection_limit",
]);

/**
 * Remove query params incompatíveis com postgres.js (ex.: ?schema=public).
 */
export function normalizePostgresConnectionUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    for (const key of [...parsed.searchParams.keys()]) {
      if (STRIP_SEARCH_PARAMS.has(key)) {
        parsed.searchParams.delete(key);
      }
    }
    const search = parsed.searchParams.toString();
    const auth =
      parsed.username.length > 0
        ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@`
        : "";
    const base = `${parsed.protocol}//${auth}${parsed.host}${parsed.pathname}`;
    return search ? `${base}?${search}` : base;
  } catch {
    return trimmed
      .replace(/([?&])schema=[^&]*&?/g, "$1")
      .replace(/[?&]$/, "");
  }
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Defina a connection string em .env.local (Supabase ou PostgreSQL local).",
    );
  }
  return normalizePostgresConnectionUrl(url);
}

/**
 * URLs de conexão PostgreSQL.
 *
 * - DATABASE_URL: runtime (Server Actions, API)
 * - DIRECT_URL: migrations e seed (opcional; cai em DATABASE_URL)
 */
export function getDatabaseUrl(): string {
  return requireDatabaseUrl();
}

export function getDirectDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return normalizePostgresConnectionUrl(direct);
  return requireDatabaseUrl();
}

export function isRemoteSupabaseUrl(url: string): boolean {
  return url.includes("supabase.com") || url.includes("supabase.co");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
