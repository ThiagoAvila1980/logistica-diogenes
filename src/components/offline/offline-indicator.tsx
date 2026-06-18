"use client";

import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSyncStatus } from "@/hooks/use-sync-status";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ícone compacto no header que mostra:
 * - Verde + nuvem: online sem pendentes
 * - Âmbar + loader: sincronizando
 * - Âmbar + nuvem com badge: online com pendentes
 * - Vermelho + nuvem off: offline
 */
export function OfflineIndicator() {
  const networkStatus = useNetworkStatus();
  const { pendingCount, phase, triggerSync } = useSyncStatus();

  const isOffline = networkStatus === "offline";
  const isSyncing = phase === "syncing";
  const hasPending = pendingCount > 0;

  if (!isOffline && !hasPending && phase === "idle") return null;

  const label = isOffline
    ? "Sem conexão"
    : isSyncing
      ? `Sincronizando ${pendingCount} medição(ões)...`
      : `${pendingCount} medição(ões) aguardando envio`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            onClick={!isOffline && hasPending ? triggerSync : undefined}
            disabled={isOffline || isSyncing}
            aria-label={label}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            ) : isOffline ? (
              <CloudOff className="h-4 w-4 text-red-500" />
            ) : (
              <>
                <Cloud className="h-4 w-4 text-amber-500" />
                {hasPending && (
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center",
                      "rounded-full bg-amber-500 text-[9px] font-bold text-white",
                    )}
                  >
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex items-center gap-1.5">
            <span>{label}</span>
            {!isOffline && hasPending && !isSyncing && (
              <RefreshCw className="h-3 w-3" />
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
