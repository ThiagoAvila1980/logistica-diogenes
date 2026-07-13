"use client";

import { useEffect, useState } from "react";
import { FieldOrderCardWithDelete } from "@/components/field/field-order-card-with-delete";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import { useIsOffline } from "@/hooks/use-network-status";
import { getCachedMeasurements } from "@/lib/offline/cache-manager";
import { fromCachedMeasurement } from "@/lib/offline/db";
import type { OrderListItem } from "@/lib/data/types";

type FieldOrderIndexProps = {
  orders: OrderListItem[];
  canDelete: boolean;
};

export function FieldOrderIndex({ orders, canDelete }: FieldOrderIndexProps) {
  const isOffline = useIsOffline();
  const [cachedOrders, setCachedOrders] = useState<OrderListItem[] | null>(null);

  // Offline "frio" (navegação nova, sem props do server): usar o snapshot do
  // IndexedDB gravado pelo FieldCacheHydrator na última visita online.
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

  const displayOrders =
    isOffline && orders.length === 0 && cachedOrders ? cachedOrders : orders;

  return (
    <FilteredOrderList
      orders={displayOrders}
      emptyMessage={
        canDelete
          ? "Nenhuma medição pendente. Toque em Nova Medição para iniciar."
          : "Nenhuma medição pendente no momento."
      }
      filterAriaLabel="Filtros de medições"
      idPrefix="field"
      getFilterFields={serviceOrderFilterFields}
      renderItem={(order) => (
        <FieldOrderCardWithDelete order={order} canDelete={canDelete} />
      )}
    />
  );
}
