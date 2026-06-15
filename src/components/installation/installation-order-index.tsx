"use client";

import { InstallationOrderCard } from "@/components/installation/installation-order-card";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import type { OrderListItem } from "@/lib/data/types";
import type { InstallationSteps } from "@/lib/transport-gates";

type InstallationOrderIndexProps = {
  orders: OrderListItem[];
  installationStepsByOs: Record<string, InstallationSteps>;
};

export function InstallationOrderIndex({
  orders,
  installationStepsByOs,
}: InstallationOrderIndexProps) {
  return (
    <FilteredOrderList
      orders={orders}
      emptyMessage="Nenhuma medição em instalação no momento."
      filterAriaLabel="Filtros de instalação"
      idPrefix="installation"
      getFilterFields={serviceOrderFilterFields}
      renderItem={(order) => (
        <InstallationOrderCard
          order={order}
          installationSteps={installationStepsByOs[order.id] ?? null}
        />
      )}
    />
  );
}
