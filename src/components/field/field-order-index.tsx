"use client";

import { useEffect, useState } from "react";
import { FieldOrderCardWithDelete } from "@/components/field/field-order-card-with-delete";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { Button } from "@/components/ui/button";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import { useIsOffline } from "@/hooks/use-network-status";
import { getCachedMeasurements } from "@/lib/offline/cache-manager";
import { fromCachedMeasurement } from "@/lib/offline/db";
import type { OrderListItem } from "@/lib/data/types";

type FieldOrderIndexProps = {
  activeOrders: OrderListItem[];
  archivedOrders: OrderListItem[];
  canDelete: boolean;
  canArchive: boolean;
};

type Tab = "active" | "archived";

export function FieldOrderIndex({
  activeOrders,
  archivedOrders,
  canDelete,
  canArchive,
}: FieldOrderIndexProps) {
  const isOffline = useIsOffline();
  const [tab, setTab] = useState<Tab>("active");
  const [cachedOrders, setCachedOrders] = useState<OrderListItem[] | null>(null);

  // Offline "frio" (navegação nova, sem props do server): usar o snapshot do
  // IndexedDB gravado pelo FieldCacheHydrator na última visita online.
  // Só se aplica à aba de ativas — arquivadas não têm cache offline.
  useEffect(() => {
    if (!isOffline) {
      setCachedOrders(null);
      return;
    }
    let cancelled = false;
    getCachedMeasurements()
      .then((cached) => {
        if (!cancelled) setCachedOrders(cached.map(fromCachedMeasurement));
      })
      .catch(() => {
        if (!cancelled) setCachedOrders(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOffline]);

  const orders = tab === "active" ? activeOrders : archivedOrders;
  const displayOrders =
    tab === "active" && isOffline && activeOrders.length === 0 && cachedOrders
      ? cachedOrders
      : orders;

  return (
    <>
      <div className="flex gap-2" role="tablist" aria-label="Listas de medições">
        <Button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          variant={tab === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("active")}
        >
          Ativas ({activeOrders.length})
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={tab === "archived"}
          variant={tab === "archived" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("archived")}
        >
          Arquivadas ({archivedOrders.length})
        </Button>
      </div>
      <FilteredOrderList
        key={tab}
        orders={displayOrders}
        emptyMessage={
          tab === "active"
            ? canDelete
              ? "Nenhuma medição pendente. Toque em Nova Medição para iniciar."
              : "Nenhuma medição pendente no momento."
            : "Nenhuma medição arquivada."
        }
        filterAriaLabel="Filtros de medições"
        idPrefix="field"
        getFilterFields={serviceOrderFilterFields}
        renderItem={(order) => (
          <FieldOrderCardWithDelete
            order={order}
            canDelete={canDelete}
            canArchive={canArchive}
            showArchive={tab === "active"}
          />
        )}
      />
    </>
  );
}
