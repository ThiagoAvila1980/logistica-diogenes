import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStorageConfig } from "./config";

const PREFIXES = (osId: string) => [
  `measurements/${osId}`,
  `installation/${osId}`,
  `advance/${osId}`,
];

async function listSupabaseKeys(
  bucket: string,
  folder: string,
): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
  });
  if (error || !data?.length) return [];

  const keys: string[] = [];
  for (const item of data) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id == null) {
      keys.push(...(await listSupabaseKeys(bucket, itemPath)));
    } else {
      keys.push(itemPath);
    }
  }
  return keys;
}

/** Remove objetos no Supabase Storage por prefixo da OS (fotos e desenhos; sem PDF). */
export async function purgeCloudStoragePrefixes(osId: string): Promise<void> {
  const config = getStorageConfig();
  if (!config.hasSupabase || !config.supabase) return;

  const supabase = getSupabaseAdmin();
  const bucket = config.supabase.bucket;

  for (const prefix of PREFIXES(osId)) {
    const keys = await listSupabaseKeys(bucket, prefix);
    if (keys.length === 0) continue;

    const { error } = await supabase.storage.from(bucket).remove(keys);
    if (error) {
      console.warn(
        "[purgeCloudStoragePrefixes]",
        prefix,
        error.message,
      );
    }
  }
}
