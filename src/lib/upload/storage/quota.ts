/** Detecta erro de cota / espaço no Supabase Storage para acionar fallback R2. */
export function isStorageQuotaError(err: unknown): boolean {
  const message = (
    err instanceof Error ? err.message : String(err ?? "")
  ).toLowerCase();

  const status =
    (err as { status?: number })?.status ??
    (err as { statusCode?: number | string })?.statusCode;

  if (status === 413 || status === "413") return true;

  return (
    message.includes("quota") ||
    message.includes("storage limit") ||
    message.includes("storagequota") ||
    message.includes("insufficient") ||
    message.includes("exceeded") ||
    message.includes("bandwidth") ||
    message.includes("payload too large") ||
    message.includes("entity too large")
  );
}
