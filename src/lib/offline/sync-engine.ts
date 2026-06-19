/**
 * Motor de sincronização offline-first para medições em campo.
 *
 * Responsabilidades:
 * - Salvar medições localmente no IndexedDB
 * - Sincronizar com o servidor quando online
 * - Retry com backoff exponencial
 * - Limpeza automática pós-sync (mantém apenas cache de leitura)
 */

import {
  getOfflineDb,
  appendSyncLog,
  type PendingMeasurement,
} from "./db";
import { getNetworkMonitor } from "./network-monitor";
import { compressPhotos } from "./photo-compress";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementDbType, MeasurementPriority } from "@/db/schema";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface SaveOfflinePayload {
  osId: string;
  items: MeasurementLineItem[];
  notes: string;
  type: MeasurementDbType;
  priority: MeasurementPriority;
  /** Fotos pendentes por itemId — serão comprimidas e salvas como Blobs */
  pendingFilesByItemId: Record<string, File[]>;
}

export type SyncResult =
  | { success: true; synced: number }
  | { success: false; message: string };

// ─── Backoff ──────────────────────────────────────────────────────────────────

const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000, 60000];

function getBackoffDelay(retryCount: number): number {
  return BACKOFF_DELAYS_MS[Math.min(retryCount, BACKOFF_DELAYS_MS.length - 1)] ?? 60000;
}

// ─── Salvar localmente ────────────────────────────────────────────────────────

/**
 * Salva medição no IndexedDB.
 * Comprime fotos pendentes antes de armazenar para economizar espaço.
 */
export async function saveMeasurementLocally(
  payload: SaveOfflinePayload,
): Promise<void> {
  const db = getOfflineDb();

  // Comprimir fotos ANTES de abrir a transação do IndexedDB.
  //
  // compressPhotos usa createImageBitmap() e canvas.toBlob() — APIs async do browser,
  // não do IndexedDB. Se chamadas dentro de uma transação Dexie, fazem o event loop ceder
  // para tarefas não-IDB, o que causa o auto-commit da transação (TransactionInactiveError).
  const compressedUploadsByItemId: Array<{
    itemId: string;
    blob: Blob;
    mimeType: string;
  }> = [];

  for (const [itemId, files] of Object.entries(payload.pendingFilesByItemId)) {
    if (!files.length) continue;
    const blobs = await compressPhotos(files);
    for (const blob of blobs) {
      compressedUploadsByItemId.push({ itemId, blob, mimeType: "image/jpeg" });
    }
  }

  const pending: Omit<PendingMeasurement, "id"> = {
    osId: payload.osId,
    items: payload.items,
    notes: payload.notes,
    type: payload.type,
    priority: payload.priority,
    status: "pending",
    clientUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  // Agora só operações IDB dentro da transação — sem awaits não-IDB.
  await db.transaction("rw", [db.pendingMeasurements, db.pendingUploads], async () => {
    const existing = await db.pendingMeasurements
      .where("osId")
      .equals(payload.osId)
      .first();

    if (existing?.id) {
      await db.pendingMeasurements.update(existing.id, pending);
      await db.pendingUploads
        .where("osId")
        .equals(payload.osId)
        .delete();
    } else {
      await db.pendingMeasurements.add(pending);
    }

    const createdAt = new Date().toISOString();
    for (const { itemId, blob, mimeType } of compressedUploadsByItemId) {
      await db.pendingUploads.add({
        osId: payload.osId,
        itemId,
        blob,
        mimeType,
        uploadType: "photo",
        status: "pending",
        createdAt,
      });
    }
  });
}

// ─── Sincronizar com servidor ─────────────────────────────────────────────────

/**
 * Sincroniza todas as medições pendentes com o servidor.
 * Importa as server actions dinamicamente para evitar bundle no cliente.
 */
export async function syncPendingMeasurements(): Promise<SyncResult> {
  const db = getOfflineDb();

  const pending = await db.pendingMeasurements
    .where("status")
    .anyOf(["pending", "error"])
    .toArray();

  if (pending.length === 0) {
    return { success: true, synced: 0 };
  }

  let synced = 0;
  const errors: string[] = [];

  for (const measurement of pending) {
    try {
      await syncSingleMeasurement(measurement);
      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      errors.push(`OS ${measurement.osId}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false as const,
      message: errors.join("; "),
    };
  }

  return { success: true, synced };
}

async function syncSingleMeasurement(measurement: PendingMeasurement): Promise<void> {
  const db = getOfflineDb();
  if (!measurement.id) return;

  // Marcar como "syncing"
  await db.pendingMeasurements.update(measurement.id, { status: "syncing" });

  try {
    // 1. Buscar uploads pendentes para essa OS
    const pendingUploads = await db.pendingUploads
      .where("osId")
      .equals(measurement.osId)
      .filter((u) => u.status === "pending" || u.status === "error")
      .toArray();

    // 2. Upload de fotos por item
    const uploadedUrlsByItemId: Record<string, string[]> = {};

    if (pendingUploads.length > 0) {
      const { uploadPhotos } = await import("@/actions/upload-actions");

      // Agrupar por itemId
      const byItem: Record<number, typeof pendingUploads> = {};
      for (const u of pendingUploads) {
        const key = u.id ?? 0;
        byItem[key] = byItem[key] ?? [];
        byItem[key].push(u);
      }

      // Agrupar por itemId (string)
      const byItemId: Record<string, typeof pendingUploads> = {};
      for (const u of pendingUploads) {
        byItemId[u.itemId] = byItemId[u.itemId] ?? [];
        byItemId[u.itemId].push(u);
      }

      for (const [itemId, uploads] of Object.entries(byItemId)) {
        const fd = new FormData();
        fd.set("osId", measurement.osId);
        fd.set("scope", "measurements");

        for (const u of uploads) {
          const file = new File([u.blob], `photo-${u.id}.jpg`, {
            type: u.mimeType,
          });
          fd.append("photos", file);
        }

        const res = await uploadPhotos(fd);
        if (!res.success) {
          throw new Error(`Upload falhou para item ${itemId}: ${res.message}`);
        }

        uploadedUrlsByItemId[itemId] = res.urls;

        // Marcar uploads como synced
        const ids = uploads.map((u) => u.id!).filter(Boolean);
        await db.pendingUploads.bulkPut(
          uploads.map((u) => ({ ...u, status: "synced" as const })),
        );
        void ids;
      }
    }

    // 3. Mesclar URLs de fotos nos items
    const itemsWithPhotos = measurement.items.map((item) => {
      const newUrls = uploadedUrlsByItemId[item.id] ?? [];
      const existingPhotos = item.photos ?? [];
      return {
        ...item,
        photos: [...existingPhotos, ...newUrls].length > 0
          ? [...existingPhotos, ...newUrls]
          : undefined,
      };
    });

    // 4. Chamar saveFieldMeasurement com FormData
    const { saveFieldMeasurement } = await import("@/actions/field-actions");
    const fd = new FormData();
    fd.set("osId", measurement.osId);
    fd.set("items", JSON.stringify(itemsWithPhotos));
    fd.set("notes", measurement.notes);
    fd.set("measurementType", measurement.type);
    fd.set("priority", measurement.priority);
    fd.set("clientUpdatedAt", measurement.clientUpdatedAt);
    // device_id: identificador estável do dispositivo (ou user-agent + tela como fallback)
    const deviceId =
      (typeof navigator !== "undefined" ? navigator.userAgent : "unknown")
        .slice(0, 128);
    fd.set("deviceId", deviceId);

    const result = await saveFieldMeasurement(fd);

    if (!result.success) {
      throw new Error(result.message);
    }

    // 5. Limpeza pós-sync: apagar dados pesados, manter apenas cache de leitura
    await db.transaction("rw", [db.pendingMeasurements, db.pendingUploads], async () => {
      await db.pendingMeasurements.delete(measurement.id!);
      await db.pendingUploads
        .where("osId")
        .equals(measurement.osId)
        .delete();
    });

    await appendSyncLog({
      osId: measurement.osId,
      result: "success",
      message: result.message,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";

    const retryCount = (measurement.retryCount ?? 0) + 1;
    await db.pendingMeasurements.update(measurement.id, {
      status: "error",
      lastError: msg,
      retryCount,
    });

    await appendSyncLog({
      osId: measurement.osId,
      result: "error",
      message: msg,
      syncedAt: new Date().toISOString(),
    });

    throw err;
  }
}

// ─── Contagem de pendentes ────────────────────────────────────────────────────

export async function getPendingCount(): Promise<number> {
  const db = getOfflineDb();
  return db.pendingMeasurements
    .where("status")
    .anyOf(["pending", "error", "syncing"])
    .count();
}

export async function getPendingMeasurements() {
  const db = getOfflineDb();
  return db.pendingMeasurements
    .where("status")
    .anyOf(["pending", "error"])
    .toArray();
}

// ─── Listener de reconexão ────────────────────────────────────────────────────

let _syncInProgress = false;
let _syncRegistered = false;

export function registerAutoSync(): void {
  if (_syncRegistered || typeof window === "undefined") return;
  _syncRegistered = true;

  const monitor = getNetworkMonitor();
  monitor.subscribe(async (isOnline) => {
    if (!isOnline || _syncInProgress) return;

    const count = await getPendingCount();
    if (count === 0) return;

    _syncInProgress = true;
    try {
      await syncPendingMeasurements();
    } finally {
      _syncInProgress = false;
    }
  });
}
