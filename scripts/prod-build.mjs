import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Build de produção "limpo": remove o .next antes de buildar.
//
// Por quê: o dev roda com `next dev --turbopack` e o build de produção usa
// webpack. Se o `.next` de um dev anterior (ou de um build interrompido) ficar
// no disco, o manifesto e os chunks emitidos podem se misturar — o navegador
// pede URLs de CSS/JS que não existem mais (404) e a página renderiza SEM
// nenhum estilo. Apagar o `.next` antes de cada build elimina essa classe de bug.

// No Coolify/Docker o .next/cache é montado via BuildKit e não pode ser
// deletado (EBUSY). Nesses casos simplesmente pulamos — o container sempre
// começa do zero, então não há risco de chunks órfãos.
try {
  rmSync(".next", { recursive: true, force: true });
  console.log("[prod-build] Pasta .next removida.");
} catch (err) {
  if (err.code === "EBUSY") {
    console.log("[prod-build] .next em uso (mount de cache do Docker) — pulando remoção.");
  } else {
    throw err;
  }
}

console.log("[prod-build] Iniciando: next build");
const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 0);
