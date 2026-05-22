import {
  getSupabaseServiceRoleKey,
  normalizeSupabaseUrl,
} from "@/lib/supabase/url";

export type StorageProviderName = "local" | "supabase" | "r2";

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

export function getStorageConfig() {
  const supabaseUrl = normalizeSupabaseUrl(env("NEXT_PUBLIC_SUPABASE_URL"));
  const supabaseServiceKey = getSupabaseServiceRoleKey();
  const supabaseBucket = env("SUPABASE_STORAGE_BUCKET") ?? "uploads";

  const r2AccountId = env("R2_ACCOUNT_ID");
  const r2AccessKey = env("R2_ACCESS_KEY_ID");
  const r2SecretKey = env("R2_SECRET_ACCESS_KEY");
  const r2Bucket = env("R2_BUCKET");
  const r2PublicUrl = env("R2_PUBLIC_URL");

  const hasSupabase = Boolean(supabaseUrl && supabaseServiceKey);
  const hasR2 = Boolean(
    r2AccountId && r2AccessKey && r2SecretKey && r2Bucket && r2PublicUrl,
  );

  const primaryEnv = env("STORAGE_PRIMARY") as StorageProviderName | undefined;
  let primary: StorageProviderName = "local";
  if (primaryEnv === "local" || primaryEnv === "r2") {
    primary = primaryEnv;
  } else if (primaryEnv === "supabase" && hasSupabase) {
    primary = "supabase";
  } else if (hasSupabase) {
    primary = "supabase";
  }

  const fallbackEnv = env("STORAGE_FALLBACK") as StorageProviderName | "none" | undefined;
  let fallback: StorageProviderName | null = null;
  if (fallbackEnv === "none") {
    fallback = null;
  } else if (fallbackEnv === "local") {
    fallback = "local";
  } else if (fallbackEnv === "r2" && hasR2) {
    fallback = "r2";
  } else if (fallbackEnv === "supabase" && hasSupabase) {
    fallback = "supabase";
  } else if (primary === "supabase" && hasR2) {
    fallback = "r2";
  }

  return {
    primary,
    fallback,
    supabase: hasSupabase
      ? {
          url: supabaseUrl!,
          serviceKey: supabaseServiceKey!,
          bucket: supabaseBucket,
        }
      : null,
    r2: hasR2
      ? {
          accountId: r2AccountId!,
          accessKey: r2AccessKey!,
          secretKey: r2SecretKey!,
          bucket: r2Bucket!,
          publicUrl: r2PublicUrl!.replace(/\/$/, ""),
        }
      : null,
    hasSupabase,
    hasR2,
  };
}
