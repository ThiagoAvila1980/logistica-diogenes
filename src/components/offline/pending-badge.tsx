"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { getOfflineDb } from "@/lib/offline/db";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PendingBadgeProps {
  osId: string;
}

/**
 * Badge indicando que esta OS tem dados salvos localmente aguardando sync.
 * Exibido nos cards da listagem /field.
 */
export function PendingBadge({ osId }: PendingBadgeProps) {
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const db = getOfflineDb();
        const entry = await db.pendingMeasurements
          .where("osId")
          .equals(osId)
          .filter((m) => m.status === "pending" || m.status === "error")
          .first();
        if (!cancelled) setIsPending(!!entry);
      } catch {
        // IndexedDB pode não estar disponível
      }
    }

    check();
    const interval = setInterval(check, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [osId]);

  if (!isPending) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <CloudOff className="h-3 w-3" />
            Pendente
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Dados salvos localmente aguardando sincronização com o servidor
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
