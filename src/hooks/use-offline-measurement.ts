"use client";

import { useCallback, useState } from "react";
import { saveMeasurementLocally, syncPendingMeasurements } from "@/lib/offline/sync-engine";
import { getNetworkMonitor } from "@/lib/offline/network-monitor";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementDbType, MeasurementPriority } from "@/db/schema";
import type { SaveFieldMeasurementResult } from "@/actions/field-actions";

export interface OfflineSavePayload {
  osId: string;
  items: MeasurementLineItem[];
  notes: string;
  type: MeasurementDbType;
  priority: MeasurementPriority;
  pendingFilesByItemId: Record<string, File[]>;
}

export type SaveMode = "online" | "offline-queued" | "offline-synced";

export interface OfflineMeasurementResult {
  success: boolean;
  message: string;
  /** Como o dado foi persistido */
  mode: SaveMode;
}

/**
 * Hook que encapsula o save offline-first das medições.
 *
 * Fluxo:
 * 1. Salva no IndexedDB imediatamente (feedback instantâneo)
 * 2. Se online: dispara sync e aguarda resultado
 * 3. Se offline: enfileira para sync posterior
 */
export function useOfflineMeasurement() {
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (payload: OfflineSavePayload): Promise<OfflineMeasurementResult> => {
      setIsSaving(true);

      try {
        // Passo 1: salvar localmente sempre (garante durabilidade)
        await saveMeasurementLocally(payload);

        const monitor = getNetworkMonitor();

        if (!monitor.isOnline) {
          return {
            success: true,
            message:
              "Medição salva localmente. Será enviada ao servidor assim que o sinal for restaurado.",
            mode: "offline-queued",
          };
        }

        // Passo 2: online — sincronizar imediatamente
        const syncResult = await syncPendingMeasurements();

        if (!syncResult.success) {
          return {
            success: true,
            message:
              "Medição salva localmente. Sincronização será tentada novamente em breve.",
            mode: "offline-queued",
          };
        }

        const count = syncResult.synced;
        return {
          success: true,
          message:
            count > 0
              ? `Medição registrada com sucesso.`
              : "Medição salva localmente.",
          mode: count > 0 ? "online" : "offline-queued",
        };
      } catch (err) {
        return {
          success: false,
          message:
            err instanceof Error ? err.message : "Erro ao salvar medição.",
          mode: "offline-queued",
        };
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return { save, isSaving };
}

/** Adapta OfflineMeasurementResult para SaveFieldMeasurementResult */
export function toSaveResult(
  result: OfflineMeasurementResult,
): SaveFieldMeasurementResult {
  return result.success
    ? { success: true, message: result.message }
    : { success: false, message: result.message };
}
