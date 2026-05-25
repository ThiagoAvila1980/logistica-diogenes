import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cores, measurements, tipoEnvidracamento, tipoVidro } from "@/db/schema";

export type LookupAdminRow = {
  id: string;
  descricao: string;
  usageCount: number;
};

function normalizeDescricao(descricao: string): string {
  return descricao.trim().toLowerCase();
}

export async function listCoresAdminDb(): Promise<LookupAdminRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: cores.idCor,
      descricao: cores.descricao,
      usageCount: sql<number>`(
        select count(*)::int
        from ${measurements} m
        cross join lateral jsonb_array_elements(coalesce(m.items, '[]'::jsonb)) as item
        where item->>'idCor' = ${cores.idCor}::text
      )`,
    })
    .from(cores)
    .orderBy(asc(cores.descricao));

  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    usageCount: r.usageCount,
  }));
}

export async function upsertCorDb(data: {
  id?: string;
  descricao: string;
}): Promise<void> {
  const db = getDb();
  const descricao = data.descricao.trim();
  if (data.id) {
    await db
      .update(cores)
      .set({ descricao })
      .where(eq(cores.idCor, data.id));
    return;
  }
  await db.insert(cores).values({ descricao });
}

export async function deleteCorDb(id: string): Promise<void> {
  const db = getDb();
  await db.delete(cores).where(eq(cores.idCor, id));
}

export async function countCorByDescricaoDb(
  descricao: string,
  excludeId?: string,
): Promise<number> {
  const db = getDb();
  const rows = await db.select({ id: cores.idCor, descricao: cores.descricao }).from(cores);
  const normalized = normalizeDescricao(descricao);
  return rows.filter(
    (r) => r.id !== excludeId && normalizeDescricao(r.descricao) === normalized,
  ).length;
}

export async function listTipoVidroAdminDb(): Promise<LookupAdminRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: tipoVidro.idTipoVidro,
      descricao: tipoVidro.descricao,
      usageCount: sql<number>`(
        select count(*)::int
        from ${measurements} m
        cross join lateral jsonb_array_elements(coalesce(m.items, '[]'::jsonb)) as item
        where item->>'idTipoVidro' = ${tipoVidro.idTipoVidro}::text
      )`,
    })
    .from(tipoVidro)
    .orderBy(asc(tipoVidro.descricao));

  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    usageCount: r.usageCount,
  }));
}

export async function upsertTipoVidroDb(data: {
  id?: string;
  descricao: string;
}): Promise<void> {
  const db = getDb();
  const descricao = data.descricao.trim();
  if (data.id) {
    await db
      .update(tipoVidro)
      .set({ descricao })
      .where(eq(tipoVidro.idTipoVidro, data.id));
    return;
  }
  await db.insert(tipoVidro).values({ descricao });
}

export async function deleteTipoVidroDb(id: string): Promise<void> {
  const db = getDb();
  await db.delete(tipoVidro).where(eq(tipoVidro.idTipoVidro, id));
}

export async function countTipoVidroByDescricaoDb(
  descricao: string,
  excludeId?: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: tipoVidro.idTipoVidro, descricao: tipoVidro.descricao })
    .from(tipoVidro);
  const normalized = normalizeDescricao(descricao);
  return rows.filter(
    (r) => r.id !== excludeId && normalizeDescricao(r.descricao) === normalized,
  ).length;
}

export async function listTipoEnvidracamentoAdminDb(): Promise<LookupAdminRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: tipoEnvidracamento.idTipoEnvidracamento,
      descricao: tipoEnvidracamento.descricao,
      usageCount: sql<number>`(
        select count(*)::int
        from ${measurements} m
        cross join lateral jsonb_array_elements(coalesce(m.items, '[]'::jsonb)) as item
        where item->>'idTipoEnvidracamento' = ${tipoEnvidracamento.idTipoEnvidracamento}::text
      )`,
    })
    .from(tipoEnvidracamento)
    .orderBy(asc(tipoEnvidracamento.descricao));

  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    usageCount: r.usageCount,
  }));
}

export async function upsertTipoEnvidracamentoDb(data: {
  id?: string;
  descricao: string;
}): Promise<void> {
  const db = getDb();
  const descricao = data.descricao.trim();
  if (data.id) {
    await db
      .update(tipoEnvidracamento)
      .set({ descricao })
      .where(eq(tipoEnvidracamento.idTipoEnvidracamento, data.id));
    return;
  }
  await db.insert(tipoEnvidracamento).values({ descricao });
}

export async function deleteTipoEnvidracamentoDb(id: string): Promise<void> {
  const db = getDb();
  await db
    .delete(tipoEnvidracamento)
    .where(eq(tipoEnvidracamento.idTipoEnvidracamento, id));
}

export async function countTipoEnvidracamentoByDescricaoDb(
  descricao: string,
  excludeId?: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({
      id: tipoEnvidracamento.idTipoEnvidracamento,
      descricao: tipoEnvidracamento.descricao,
    })
    .from(tipoEnvidracamento);
  const normalized = normalizeDescricao(descricao);
  return rows.filter(
    (r) => r.id !== excludeId && normalizeDescricao(r.descricao) === normalized,
  ).length;
}
