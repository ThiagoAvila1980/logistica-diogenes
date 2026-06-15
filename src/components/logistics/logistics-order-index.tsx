"use client";

import { LogisticsOrderCard } from "@/components/logistics/logistics-order-card";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import type { OrderListItem } from "@/lib/data/types";
import type { LogisticsSummary } from "@/lib/data/logistics";
import type { TransportSteps } from "@/lib/transport-gates";

type LogisticsOrderIndexProps = {
  orders: OrderListItem[];
  summaries: Record<string, LogisticsSummary>;
  transportStepsByOs: Record<string, TransportSteps>;
};

export function LogisticsOrderIndex({
  orders,
  summaries,
  transportStepsByOs,
}: LogisticsOrderIndexProps) {
  return (
    <FilteredOrderList
      orders={orders}
      emptyMessage="Nenhuma medição em transporte no momento."
      filterAriaLabel="Filtros de transporte"
      idPrefix="logistics"
      getFilterFields={serviceOrderFilterFields}
      renderItem={(order) => (
        <LogisticsOrderCard
          order={order}
          logistics={summaries[order.id] ?? null}
          transportSteps={transportStepsByOs[order.id] ?? null}
        />
      )}
    />
  );
}
