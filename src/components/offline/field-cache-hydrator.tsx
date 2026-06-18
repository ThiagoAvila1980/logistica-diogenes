"use client";

import { useEffect } from "react";
import {
  cacheMeasurementList,
  cacheLookups,
  pruneStaleCache,
} from "@/lib/offline/cache-manager";
import type { OrderListItem } from "@/lib/data/types";
import type { MeasurementLookups } from "@/lib/data/lookup-types";

interface FieldCacheHydratorProps {
  orders: OrderListItem[];
  lookups?: MeasurementLookups;
}

/**
 * Componente invisível que popula o IndexedDB com dados de leitura
 * sempre que a página /field carrega com internet disponível.
 *
 * Esses dados ficam disponíveis para quando o usuário voltar offline.
 */
export function FieldCacheHydrator({ orders, lookups }: FieldCacheHydratorProps) {
  useEffect(() => {
    async function hydrate() {
      try {
        await cacheMeasurementList(orders);
        await pruneStaleCache(orders.map((o) => o.id));
        if (lookups) {
          await cacheLookups(lookups);
        }
      } catch {
        // Cache é best-effort — não interromper se falhar
      }
    }

    hydrate();
  }, [orders, lookups]);

  return null;
}
