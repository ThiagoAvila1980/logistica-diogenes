import { getDb } from "@/db";
import { tipoEnvidracamento } from "@/db/schema";
import { espelhoTipoIdsFromDescricoes } from "@/lib/workflow/espelho-vao";

/** IDs de tipo de envidraçamento cuja descrição é de espelho. */
export async function loadEspelhoTipoIds(): Promise<ReadonlySet<string>> {
  const db = getDb();
  const rows = await db
    .select({
      id: tipoEnvidracamento.idTipoEnvidracamento,
      descricao: tipoEnvidracamento.descricao,
    })
    .from(tipoEnvidracamento);

  return espelhoTipoIdsFromDescricoes(rows);
}
