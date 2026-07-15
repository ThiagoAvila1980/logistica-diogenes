"use client";

import { InstallationOrderCard } from "@/components/installation/installation-order-card";
import { OrderCardWithDelete } from "@/components/order/order-card-with-delete";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import type { OrderListItem } from "@/lib/data/types";
import type { InstallationSummary } from "@/lib/data/installation";
import type { InstallationOrderProgress } from "@/lib/data/installation-steps-batch";

type InstallationOrderIndexProps = {
  orders: OrderListItem[];
  summaries: Record<string, InstallationSummary>;
  installationStepsByOs: Record<string, InstallationOrderProgress>;
  canDelete?: boolean;
};

export function InstallationOrderIndex({
  orders,
  summaries,
  installationStepsByOs,
  canDelete = false,
}: InstallationOrderIndexProps) {
  return (
    <FilteredOrderList
      orders={orders}
      emptyMessage="Nenhuma medição em instalação no momento."
      filterAriaLabel="Filtros de instalação"
      idPrefix="installation"
      getFilterFields={serviceOrderFilterFields}
      renderItem={(order) => (
        <OrderCardWithDelete
          order={order}
          canDelete={canDelete}
          redirectHref="/installation"
        >
          <InstallationOrderCard
            order={order}
            installation={summaries[order.id] ?? null}
            installationSteps={installationStepsByOs[order.id] ?? null}
          />
        </OrderCardWithDelete>
      )}
    />
  );
}
