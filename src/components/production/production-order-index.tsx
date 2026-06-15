"use client";

import { ProductionOrderCard } from "@/components/production/production-order-card";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import type { OrderListItem } from "@/lib/data/types";
import type { CuttingSteps } from "@/lib/transport-gates";

type ProductionOrderIndexProps = {
  orders: OrderListItem[];
  stepsByOs: Record<string, CuttingSteps>;
};

export function ProductionOrderIndex({
  orders,
  stepsByOs,
}: ProductionOrderIndexProps) {
  return (
    <FilteredOrderList
      orders={orders}
      emptyMessage="Nenhuma medição nesta etapa."
      filterAriaLabel="Filtros do plano de corte"
      idPrefix="production"
      getFilterFields={serviceOrderFilterFields}
      renderItem={(order) => (
        <ProductionOrderCard
          order={order}
          steps={
            stepsByOs[order.id] ?? {
              corteFeito: false,
              embalagemFeita: false,
              acessoriosFeitos: false,
              vidrosFeitos: false,
            }
          }
        />
      )}
    />
  );
}
