"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPendingCount, syncPendingMeasurements } from "@/lib/offline/sync-engine";
import { getNetworkMonitor } from "@/lib/offline/network-monitor";

export type SyncPhase = "idle" | "syncing" | "success" | "error";

export interface SyncStatus {
  pendingCount: number;
  phase: SyncPhase;
  lastError: string | null;
  /** Força sincronização manual */
  triggerSync: () => Promise<void>;
}

/**
 * Estado reativo do motor de sincronização offline.
 * Atualiza `pendingCount` periodicamente e ao reconectar.
 */
export function useSyncStatus(): SyncStatus {
  const [pendingCount, setPendingCount] = useState(0);
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setPhase("syncing");
    setLastError(null);

    try {
      const result = await syncPendingMeasurements();
      if (result.success) {
        setPhase("success");
      } else {
        setPhase("error");
        setLastError("message" in result ? result.message : null);
      }
    } catch (err) {
      setPhase("error");
      setLastError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      syncingRef.current = false;
      await refreshCount();
      // Voltar para idle após 3s
      setTimeout(() => setPhase((p) => (p !== "syncing" ? "idle" : p)), 3000);
    }
  }, [refreshCount]);

  useEffect(() => {
    refreshCount();

    // Atualizar contagem a cada 10s
    const interval = setInterval(refreshCount, 10_000);

    // Atualizar ao reconectar
    const monitor = getNetworkMonitor();
    const unsubscribe = monitor.subscribe((isOnline) => {
      if (isOnline) refreshCount();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refreshCount]);

  return { pendingCount, phase, lastError, triggerSync };
}
