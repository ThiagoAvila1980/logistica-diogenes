import { and, asc, eq, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { servicos } from "@/db/schema";
import type { ServicoEscopo } from "@/db/schema";

export type ServicoRow = {
  id: string;
  descricao: string;
  valor: string;
  tempo: string | null;
  meta: string | null;
  bonus: string | null;
  escopo: ServicoEscopo;
};

type ServicoDb = Pick<
  ReturnType<typeof getDb>,
  "insert" | "select" | "update" | "delete"
>;

export async function listServicosDb(): Promise<ServicoRow[]> {
  const db = getDb();
  return db
    .select({
      id: servicos.id,
      descricao: servicos.descricao,
      valor: servicos.valor,
      tempo: servicos.tempo,
      meta: servicos.meta,
      bonus: servicos.bonus,
      escopo: servicos.escopo,
    })
    .from(servicos)
    .orderBy(asc(servicos.escopo), asc(servicos.descricao));
}

export async function descricaoServicoEmUsoDb(
  descricao: string,
  excludeId?: string,
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: servicos.id })
    .from(servicos)
    .where(
      and(
        sql`lower(${servicos.descricao}) = lower(${descricao})`,
        excludeId ? ne(servicos.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function upsertServicoDb(
  data: Omit<ServicoRow, "id"> & { id?: string },
  tx?: ServicoDb,
): Promise<string> {
  const db = tx ?? getDb();
  const values = {
    descricao: data.descricao,
    valor: data.valor,
    tempo: data.tempo,
    meta: data.meta,
    bonus: data.bonus,
    escopo: data.escopo,
    updatedAt: new Date(),
  };

  if (data.id) {
    await db.update(servicos).set(values).where(eq(servicos.id, data.id));
    return data.id;
  }

  const [inserted] = await db
    .insert(servicos)
    .values(values)
    .returning({ id: servicos.id });
  return inserted.id;
}

export async function deleteServicoDb(id: string, tx?: ServicoDb): Promise<void> {
  const db = tx ?? getDb();
  await db.delete(servicos).where(eq(servicos.id, id));
}
