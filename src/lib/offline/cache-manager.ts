/**
 * Gerencia o cache de dados de leitura no IndexedDB.
 *
 * Dados cacheados (leves, mantidos mesmo após sync):
 * - Lista de medições (OrderListItem) atribuídas ao medidor logado
 * - Lookups: ambientes, cores, tipos de vidro, tipos de envidraçamento
 *
 * Dados purgados após sync bem-sucedido:
 * - pendingMeasurements
 * - pendingUploads
 */

import {
  getOfflineDb,
  toCachedMeasurement,
  type CachedMeasurement,
  type CachedOrderDetail,
} from "./db";
import type { OrderListItem, OrderDetail } from "@/lib/data/types";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import type { FieldMeasurementDraft } from "@/lib/data/field";

// ─── Cache de medições ────────────────────────────────────────────────────────

/** Salva lista de medições no cache de leitura */
export async function cacheMeasurementList(
  orders: OrderListItem[],
): Promise<void> {
  const db = getOfflineDb();
  const entries = orders.map(toCachedMeasurement);
  await db.cachedMeasurements.bulkPut(entries);
}

/** Retorna lista de medições do cache */
export async function getCachedMeasurements(): Promise<CachedMeasurement[]> {
  const db = getOfflineDb();
  return db.cachedMeasurements.orderBy("updatedAt").reverse().toArray();
}

/** Remove entradas de medições que não estão mais na lista do servidor */
export async function pruneStaleCache(serverIds: string[]): Promise<void> {
  const db = getOfflineDb();
  const cached = await db.cachedMeasurements.toArray();
  const toDelete = cached
    .filter((c) => !serverIds.includes(c.id))
    .map((c) => c.id);
  if (toDelete.length > 0) {
    await db.cachedMeasurements.bulkDelete(toDelete);
  }
}

// ─── Cache de lookups ─────────────────────────────────────────────────────────

const LOOKUPS_CACHE_KEY = "measurement_lookups";
const LOOKUPS_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/** Salva lookups no cache */
export async function cacheLookups(lookups: MeasurementLookups): Promise<void> {
  const db = getOfflineDb();
  await db.cachedLookups.put({
    key: LOOKUPS_CACHE_KEY,
    data: lookups,
    cachedAt: new Date().toISOString(),
  });
}

/** Retorna lookups do cache se ainda válidos */
export async function getCachedLookups(): Promise<MeasurementLookups | null> {
  const db = getOfflineDb();
  const entry = await db.cachedLookups.get(LOOKUPS_CACHE_KEY);
  if (!entry) return null;

  const age = Date.now() - new Date(entry.cachedAt).getTime();
  if (age > LOOKUPS_TTL_MS) return null;

  return entry.data as MeasurementLookups;
}

// ─── Cache do detalhe da OS (draft + lookups) ─────────────────────────────────

/** Salva o snapshot de uma OS (order + drafts dos dois tipos + lookups) para reabrir offline */
export async function cacheOrderDetail(params: {
  osId: string;
  order: OrderDetail;
  draftsByType: {
    orcamento?: FieldMeasurementDraft;
    final?: FieldMeasurementDraft;
  };
  lookups: MeasurementLookups;
}): Promise<void> {
  const db = getOfflineDb();
  const entry: CachedOrderDetail = {
    osId: params.osId,
    order: params.order,
    draftsByType: params.draftsByType,
    lookups: params.lookups,
    cachedAt: new Date().toISOString(),
  };
  await db.cachedOrderDetails.put(entry);
}

/** Retorna o snapshot cacheado de uma OS, se existir */
export async function getCachedOrderDetail(
  osId: string,
): Promise<CachedOrderDetail | undefined> {
  const db = getOfflineDb();
  return db.cachedOrderDetails.get(osId);
}
