import { getStorageConfig } from "./config";

/** URLs salvas no banco: local, Supabase ou R2. */
export function isPersistedUploadUrl(url: string): boolean {
  if (url.startsWith("/uploads/")) return true;
  if (!url.startsWith("https://")) return false;

  const config = getStorageConfig();
  if (config.hasSupabase && url.includes(".supabase.co/storage/")) return true;
  if (config.hasR2 && config.r2 && url.startsWith(config.r2.publicUrl)) {
    return true;
  }

  return url.includes("/storage/v1/object/public/") || url.includes(".r2.dev/");
}
