/**
 * Testa Supabase Storage: node --env-file=.env.local scripts/storage-ping.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() ?? "uploads";

if (!url || !key) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const testKey = `_ping/${Date.now()}.txt`;
const body = Buffer.from("fluxo-diogenes-storage-ping");

const { error: uploadError } = await supabase.storage
  .from(bucket)
  .upload(testKey, body, { contentType: "text/plain", upsert: true });

if (uploadError) {
  console.error("Upload falhou:", uploadError.message);
  process.exit(1);
}

const { data } = supabase.storage.from(bucket).getPublicUrl(testKey);
console.log("OK — bucket:", bucket);
console.log("URL de teste:", data.publicUrl);

await supabase.storage.from(bucket).remove([testKey]);
console.log("Arquivo de teste removido.");
