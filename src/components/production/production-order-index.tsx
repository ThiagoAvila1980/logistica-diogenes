"use client";

import { ProductionOrderCard } from "@/components/production/production-order-card";
import { OrderCardAddVaosAction } from "@/components/order/order-card-add-vaos-action";
import { OrderCardDeleteAction } from "@/components/order/order-card-delete-action";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import type { OrderListItem } from "@/lib/data/types";
import type { CuttingSteps } from "@/lib/transport-gates";

type ProductionOrderIndexProps = {
  orders: OrderListItem[];
  stepsByOs: Record<string, CuttingSteps>;
  canDelete?: boolean;
  canAddVaos?: boolean;
};

export function ProductionOrderIndex({
  orders,
  stepsByOs,
  canDelete = false,
  canAddVaos = false,
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
          actions={
            canAddVaos || canDelete ? (
              <div
                className="flex shrink-0 items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {canAddVaos ? (
                  <OrderCardAddVaosAction osId={order.id} />
                ) : null}
                {canDelete ? (
                  <OrderCardDeleteAction
                    order={order}
                    redirectHref="/production"
                  />
                ) : null}
              </div>
            ) : undefined
          }
        />
      )}
    />
  );
}
