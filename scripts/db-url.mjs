/** Parâmetros de Prisma/Drizzle que o driver postgres.js repassa como GUC inválido. */
const STRIP_SEARCH_PARAMS = new Set([
  "schema",
  "pgbouncer",
  "connection_limit",
]);

/**
 * Remove query params incompatíveis com postgres.js (ex.: ?schema=public).
 */
export function normalizePostgresConnectionUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    for (const key of [...parsed.searchParams.keys()]) {
      if (STRIP_SEARCH_PARAMS.has(key)) {
        parsed.searchParams.delete(key);
      }
    }
    const search = parsed.searchParams.toString();
    return search
      ? `${parsed.protocol}//${parsed.username ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@` : ""}${parsed.host}${parsed.pathname}?${search}`
      : `${parsed.protocol}//${parsed.username ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ""}@` : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    return trimmed.replace(/([?&])schema=[^&]*&?/g, "$1").replace(/[?&]$/, "");
  }
}

export function getDatabaseUrlFromEnv() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL não configurada");
  return normalizePostgresConnectionUrl(url);
}

export function getDirectDatabaseUrlFromEnv() {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return normalizePostgresConnectionUrl(direct);
  return getDatabaseUrlFromEnv();
}

export function isRemoteSupabaseUrl(url) {
  return url.includes("supabase.com") || url.includes("supabase.co");
}

export function postgresSslOption(url) {
  return isRemoteSupabaseUrl(url) ? "require" : undefined;
}
