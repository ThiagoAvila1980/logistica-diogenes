"use client";

import { InstallationOrderCard } from "@/components/installation/installation-order-card";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import type { OrderListItem } from "@/lib/data/types";
import type { InstallationSummary } from "@/lib/data/installation";
import type { InstallationOrderProgress } from "@/lib/data/installation-steps-batch";

type InstallationOrderIndexProps = {
  orders: OrderListItem[];
  summaries: Record<string, InstallationSummary>;
  installationStepsByOs: Record<string, InstallationOrderProgress>;
};

export function InstallationOrderIndex({
  orders,
  summaries,
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
          installation={summaries[order.id] ?? null}
          installationSteps={installationStepsByOs[order.id] ?? null}
        />
      )}
    />
  );
}
