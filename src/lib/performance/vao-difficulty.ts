import "server-only";

import { eq } from "drizzle-orm";
import { tipoEnvidracamento } from "@/db/schema";
import type { getDb } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = Pick<ReturnType<typeof getDb>, "select">;

/**
 * Retorna o multiplicador de dificuldade do tipo de envidraçamento.
 * Padrão 1 quando o tipo não existe ou não foi informado.
 */
export async function getVaoDificuldadeMultiplier(
  db: AnyDb,
  idTipoEnvidracamento: string | null | undefined,
): Promise<number> {
  if (!idTipoEnvidracamento) return 1;

  const [row] = await db
    .select({ dificuldade: tipoEnvidracamento.dificuldade })
    .from(tipoEnvidracamento)
    .where(eq(tipoEnvidracamento.idTipoEnvidracamento, idTipoEnvidracamento))
    .limit(1);

  return row?.dificuldade ?? 1;
}
