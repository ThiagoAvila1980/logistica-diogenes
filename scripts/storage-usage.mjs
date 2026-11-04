/**
 * Levantamento de uso de espaço no Supabase Storage.
 * Uso: node --env-file=.env.local scripts/storage-usage.mjs
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

let totalBytes = 0;
let totalFiles = 0;
const byTopFolder = new Map();
const byExt = new Map();

async function listAll(prefix) {
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      console.error(`Erro ao listar "${prefix}":`, error.message);
      return;
    }
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = entry.id === null;
      if (isFolder) {
        await listAll(fullPath);
      } else {
        const size = entry.metadata?.size ?? 0;
        totalBytes += size;
        totalFiles += 1;

        const top = prefix ? prefix.split("/")[0] : entry.name.split("/")[0] ?? "(raiz)";
        byTopFolder.set(top, (byTopFolder.get(top) ?? 0) + size);

        const ext = entry.name.includes(".") ? entry.name.split(".").pop().toLowerCase() : "(sem extensão)";
        byExt.set(ext, (byExt.get(ext) ?? 0) + size);
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }
}

function humanSize(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(2)} ${units[i]}`;
}

console.log(`Varrendo bucket "${bucket}"...`);
await listAll("");

console.log("\n=== RESUMO ===");
console.log(`Total de arquivos: ${totalFiles}`);
console.log(`Total de espaço: ${humanSize(totalBytes)} (${totalBytes} bytes)`);

console.log("\n=== Por pasta de topo ===");
for (const [folder, size] of [...byTopFolder.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${folder.padEnd(30)} ${humanSize(size).padStart(12)}`);
}

console.log("\n=== Por extensão ===");
for (const [ext, size] of [...byExt.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`.${ext.padEnd(15)} ${humanSize(size).padStart(12)}`);
}
