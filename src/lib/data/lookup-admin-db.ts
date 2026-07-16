import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cores, measurements, tipoEnvidracamento, tipoVidro, ambientes } from "@/db/schema";

export type LookupAdminRow = {
  id: string;
  descricao: string;
  usageCount: number;
  imagemUrl?: string | null;
  dificuldade?: number;
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
}): Promise<string> {
  const db = getDb();
  const descricao = data.descricao.trim();
  if (data.id) {
    await db
      .update(cores)
      .set({ descricao })
      .where(eq(cores.idCor, data.id));
    return data.id;
  }
  const [inserted] = await db.insert(cores).values({ descricao }).returning({ id: cores.idCor });
  return inserted.id;
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
}): Promise<string> {
  const db = getDb();
  const descricao = data.descricao.trim();
  if (data.id) {
    await db
      .update(tipoVidro)
      .set({ descricao })
      .where(eq(tipoVidro.idTipoVidro, data.id));
    return data.id;
  }
  const [inserted] = await db.insert(tipoVidro).values({ descricao }).returning({ id: tipoVidro.idTipoVidro });
  return inserted.id;
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
      imagemUrl: tipoEnvidracamento.imagemUrl,
      dificuldade: tipoEnvidracamento.dificuldade,
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
    imagemUrl: r.imagemUrl,
    dificuldade: r.dificuldade,
    usageCount: r.usageCount,
  }));
}

export async function getTipoEnvidracamentoDificuldadeDb(
  id: string,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ dificuldade: tipoEnvidracamento.dificuldade })
    .from(tipoEnvidracamento)
    .where(eq(tipoEnvidracamento.idTipoEnvidracamento, id))
    .limit(1);
  return row?.dificuldade ?? 1;
}

export async function getTipoEnvidracamentoImagemUrlDb(
  id: string,
): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ imagemUrl: tipoEnvidracamento.imagemUrl })
    .from(tipoEnvidracamento)
    .where(eq(tipoEnvidracamento.idTipoEnvidracamento, id))
    .limit(1);
  return row?.imagemUrl ?? null;
}

export async function upsertTipoEnvidracamentoDb(data: {
  id?: string;
  descricao: string;
  imagemUrl?: string | null;
  dificuldade?: number;
}): Promise<string> {
  const db = getDb();
  const descricao = data.descricao.trim();
  const imagemUrl = data.imagemUrl ?? null;
  const dificuldade = data.dificuldade ?? 1;
  if (data.id) {
    await db
      .update(tipoEnvidracamento)
      .set({ descricao, imagemUrl, dificuldade })
      .where(eq(tipoEnvidracamento.idTipoEnvidracamento, data.id));
    return data.id;
  }
  const [inserted] = await db.insert(tipoEnvidracamento).values({ descricao, imagemUrl, dificuldade }).returning({ id: tipoEnvidracamento.idTipoEnvidracamento });
  return inserted.id;
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

export async function listAmbientesAdminDb(): Promise<LookupAdminRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: ambientes.idAmbiente,
      descricao: ambientes.descricao,
      usageCount: sql<number>`(
        select count(*)::int
        from ${measurements} m
        cross join lateral jsonb_array_elements(coalesce(m.items, '[]'::jsonb)) as item
        where item->>'idAmbiente' = ${ambientes.idAmbiente}::text
      )`,
    })
    .from(ambientes)
    .orderBy(asc(ambientes.descricao));

  return rows.map((r) => ({
    id: r.id,
    descricao: r.descricao,
    usageCount: r.usageCount,
  }));
}

export async function upsertAmbienteDb(data: {
  id?: string;
  descricao: string;
}): Promise<string> {
  const db = getDb();
  const descricao = data.descricao.trim();
  if (data.id) {
    await db
      .update(ambientes)
      .set({ descricao })
      .where(eq(ambientes.idAmbiente, data.id));
    return data.id;
  }
  const [inserted] = await db.insert(ambientes).values({ descricao }).returning({ id: ambientes.idAmbiente });
  return inserted.id;
}

export async function deleteAmbienteDb(id: string): Promise<void> {
  const db = getDb();
  await db.delete(ambientes).where(eq(ambientes.idAmbiente, id));
}

export async function countAmbienteByDescricaoDb(
  descricao: string,
  excludeId?: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: ambientes.idAmbiente, descricao: ambientes.descricao })
    .from(ambientes);
  const normalized = normalizeDescricao(descricao);
  return rows.filter(
    (r) => r.id !== excludeId && normalizeDescricao(r.descricao) === normalized,
  ).length;
}
