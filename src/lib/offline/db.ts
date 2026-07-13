import Dexie, { type EntityTable } from "dexie";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementDbType, MeasurementPriority, OsStatus } from "@/db/schema";
import type { OrderListItem, OrderDetail } from "@/lib/data/types";
import type { FieldMeasurementDraft } from "@/lib/data/field";
import type { MeasurementLookups } from "@/lib/data/lookup-types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type PendingSyncStatus = "pending" | "syncing" | "synced" | "error";

/** Medição salva localmente aguardando sincronização com o servidor */
export interface PendingMeasurement {
  /** Chave primária local (auto-increment) */
  id?: number;
  /** UUID da medição no servidor */
  osId: string;
  items: MeasurementLineItem[];
  notes: string;
  type: MeasurementDbType;
  priority: MeasurementPriority;
  status: PendingSyncStatus;
  /** ISO string — usado para resolução de conflitos last-write-wins */
  clientUpdatedAt: string;
  createdAt: string;
  /** Mensagem de erro do último sync tentado */
  lastError?: string;
  /** Quantas tentativas de sync já foram feitas */
  retryCount: number;
  /** Epoch ms — não tentar novo retry automático antes deste horário (backoff) */
  nextRetryAt?: number;
}

/** Upload de foto ou desenho aguardando sync */
export interface PendingUpload {
  id?: number;
  osId: string;
  itemId: string;
  blob: Blob;
  /** Extensão original do arquivo (ex: "jpeg", "png") */
  mimeType: string;
  uploadType: "photo" | "drawing";
  drawingId?: string;
  status: PendingSyncStatus;
  createdAt: string;
}

/** Cache de medição para leitura offline — snapshot do que veio do server */
export interface CachedMeasurement {
  /** UUID da medição (mesmo que osId) */
  id: string;
  number: string;
  status: OsStatus;
  type: MeasurementDbType;
  measurementStatus: "pendente" | "medida";
  priority: MeasurementPriority;
  clientName: string;
  assignedUserId: string | null;
  scheduledDate: string | null;
  updatedAt: string;
  budgetReference: string | null;
  hasMeasurement: boolean;
  cachedAt: string;
}

/** Cache de lookups (ambientes, cores, vidros, envidraçamentos) */
export interface CachedLookup {
  /** "ambientes" | "cores" | "tiposVidro" | "tiposEnvidracamento" */
  key: string;
  data: unknown;
  cachedAt: string;
}

/** Registro dos últimos syncs para diagnóstico */
export interface SyncLogEntry {
  id?: number;
  osId: string;
  result: "success" | "error";
  message: string;
  syncedAt: string;
}

/** Snapshot completo de uma OS (dados + drafts de ambos os tipos + lookups) para abrir offline */
export interface CachedOrderDetail {
  /** UUID da OS — mesma chave usada em cachedMeasurements */
  osId: string;
  order: OrderDetail;
  draftsByType: {
    orcamento?: FieldMeasurementDraft;
    final?: FieldMeasurementDraft;
  };
  lookups: MeasurementLookups;
  cachedAt: string;
}

// ─── Database ─────────────────────────────────────────────────────────────────

class OfflineDatabase extends Dexie {
  pendingMeasurements!: EntityTable<PendingMeasurement, "id">;
  pendingUploads!: EntityTable<PendingUpload, "id">;
  cachedMeasurements!: EntityTable<CachedMeasurement, "id">;
  cachedLookups!: EntityTable<CachedLookup, "key">;
  syncLog!: EntityTable<SyncLogEntry, "id">;
  cachedOrderDetails!: EntityTable<CachedOrderDetail, "osId">;

  constructor() {
    super("FluxoDiogenesOffline");

    this.version(1).stores({
      pendingMeasurements: "++id, osId, status, clientUpdatedAt",
      pendingUploads: "++id, osId, itemId, status, uploadType",
      cachedMeasurements: "id, status, assignedUserId, cachedAt",
      cachedLookups: "key",
      syncLog: "++id, osId, result, syncedAt",
    });

    this.version(2).stores({
      pendingMeasurements: "++id, osId, status, clientUpdatedAt",
      pendingUploads: "++id, osId, itemId, status, uploadType",
      cachedMeasurements: "id, status, assignedUserId, cachedAt",
      cachedLookups: "key",
      syncLog: "++id, osId, result, syncedAt",
      cachedOrderDetails: "osId, cachedAt",
    });
  }
}

let _db: OfflineDatabase | null = null;

/** Singleton do banco local — seguro para chamar múltiplas vezes */
export function getOfflineDb(): OfflineDatabase {
  if (!_db) {
    _db = new OfflineDatabase();
  }
  return _db;
}

// ─── Helpers de log de sync ───────────────────────────────────────────────────

/** Registra resultado de sync e mantém apenas os últimos 50 registros */
export async function appendSyncLog(
  entry: Omit<SyncLogEntry, "id">,
): Promise<void> {
  const db = getOfflineDb();
  await db.syncLog.add(entry);

  const count = await db.syncLog.count();
  if (count > 50) {
    const oldest = await db.syncLog.orderBy("id").limit(count - 50).toArray();
    await db.syncLog.bulkDelete(oldest.map((e) => e.id!));
  }
}

/** Converte OrderListItem do servidor para CachedMeasurement */
export function toCachedMeasurement(item: OrderListItem): CachedMeasurement {
  return {
    id: item.id,
    number: item.number,
    status: item.status,
    type: item.type,
    measurementStatus: item.measurementStatus,
    priority: item.priority,
    clientName: item.clientName,
    assignedUserId: item.assignedUserId,
    scheduledDate: item.scheduledDate?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
    budgetReference: item.budgetReference,
    hasMeasurement: item.hasMeasurement,
    cachedAt: new Date().toISOString(),
  };
}

/** Converte de volta CachedMeasurement para OrderListItem (leitura offline) */
export function fromCachedMeasurement(cached: CachedMeasurement): OrderListItem {
  return {
    id: cached.id,
    number: cached.number,
    status: cached.status,
    type: cached.type,
    measurementStatus: cached.measurementStatus,
    priority: cached.priority,
    clientName: cached.clientName,
    assignedUserId: cached.assignedUserId,
    scheduledDate: cached.scheduledDate ? new Date(cached.scheduledDate) : null,
    updatedAt: new Date(cached.updatedAt),
    budgetReference: cached.budgetReference,
    hasMeasurement: cached.hasMeasurement,
  };
}
