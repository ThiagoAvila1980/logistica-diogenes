"use client";

import { CheckCircle2, Loader2, WifiOff, XCircle } from "lucide-react";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Barra discreta no topo da página /field exibindo status de sync.
 * Só renderiza quando há algo relevante para mostrar.
 */
export function SyncStatusBar() {
  const { pendingCount, phase, lastError, triggerSync } = useSyncStatus();
  const networkStatus = useNetworkStatus();
  const isOffline = networkStatus === "offline";

  if (phase === "idle" && pendingCount === 0 && !isOffline) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm",
        isOffline &&
          "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
        !isOffline &&
          phase === "syncing" &&
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
        !isOffline &&
          phase === "success" &&
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400",
        !isOffline &&
          phase === "error" &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
        !isOffline &&
          phase === "idle" &&
          pendingCount > 0 &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
      )}
    >
      <div className="flex items-center gap-2">
        {isOffline && <WifiOff className="h-4 w-4 shrink-0" />}
        {!isOffline && phase === "syncing" && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        )}
        {!isOffline && phase === "success" && (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
        {!isOffline && phase === "error" && (
          <XCircle className="h-4 w-4 shrink-0" />
        )}
        {!isOffline && phase === "idle" && pendingCount > 0 && (
          <WifiOff className="h-4 w-4 shrink-0" />
        )}

        <span>
          {isOffline &&
            (pendingCount > 0
              ? `Sem conexão — ${pendingCount} medição(ões) salva(s) localmente`
              : "Sem conexão — novas medições serão salvas localmente")}
          {!isOffline &&
            phase === "syncing" &&
            `Sincronizando ${pendingCount} medição(ões)...`}
          {!isOffline && phase === "success" && "Medições sincronizadas!"}
          {!isOffline && phase === "error" && (lastError ?? "Erro ao sincronizar")}
          {!isOffline &&
            phase === "idle" &&
            pendingCount > 0 &&
            `${pendingCount} medição(ões) aguardando envio`}
        </span>
      </div>

      {!isOffline && phase !== "syncing" && pendingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 text-xs"
          onClick={triggerSync}
        >
          Enviar agora
        </Button>
      )}
    </div>
  );
}
