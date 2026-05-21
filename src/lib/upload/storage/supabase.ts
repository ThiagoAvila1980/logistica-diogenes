import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { StorageProvider } from "./types";

export function createSupabaseStorageProvider(bucket: string): StorageProvider {
  return {
    name: "supabase",

    async putObject(key, body, contentType) {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.from(bucket).upload(key, body, {
        contentType,
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      return data.publicUrl;
    },

    async deleteObject(url) {
      const key = extractSupabaseStorageKey(url, bucket);
      if (!key) return;
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage.from(bucket).remove([key]);
      if (error) {
        console.warn("[supabaseStorage.deleteObject]", key, error.message);
      }
    },
  };
}

function extractSupabaseStorageKey(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
    }
  } catch {
    return null;
  }
  return null;
}
