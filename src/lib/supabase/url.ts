/** Normaliza e valida a URL pública do projeto Supabase. */
export function normalizeSupabaseUrl(
  raw: string | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getSupabaseServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key || null;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      getSupabaseServiceRoleKey(),
  );
}
