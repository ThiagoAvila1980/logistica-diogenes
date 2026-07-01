import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// Build de produção "limpo": remove o .next antes de buildar.
//
// Por quê: o dev roda com `next dev --turbopack` e o build de produção usa
// webpack. Se o `.next` de um dev anterior (ou de um build interrompido) ficar
// no disco, o manifesto e os chunks emitidos podem se misturar — o navegador
// pede URLs de CSS/JS que não existem mais (404) e a página renderiza SEM
// nenhum estilo. Apagar o `.next` antes de cada build elimina essa classe de bug.
//
// No Coolify/Docker, `.next/cache` pode estar montado como volume (EBUSY) —
// nesse caso apagamos só o restante e seguimos.

function removeNextOutputDir() {
  const nextDir = ".next";
  if (!existsSync(nextDir)) return;

  try {
    rmSync(nextDir, { recursive: true, force: true });
    console.log("[prod-build] Pasta .next removida.");
    return;
  } catch (err) {
    if (err?.code !== "EBUSY" && err?.code !== "EPERM") throw err;
  }

  for (const entry of readdirSync(nextDir)) {
    if (entry === "cache") continue;
    rmSync(join(nextDir, entry), { recursive: true, force: true });
  }
  console.log("[prod-build] Pasta .next limpa (cache montado preservado).");
}

removeNextOutputDir();

console.log("[prod-build] Iniciando: next build");
const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 0);
