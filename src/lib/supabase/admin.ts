import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleKey,
  normalizeSupabaseUrl,
} from "@/lib/supabase/url";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      "Supabase Storage: configure NEXT_PUBLIC_SUPABASE_URL (https://...) e SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}
