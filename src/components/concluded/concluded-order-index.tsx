"use client";

import { ConcludedOrderCard } from "@/components/concluded/concluded-order-card";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import type { ConcludedOrderItem } from "@/lib/data/concluded-orders";
import type { OrderFilterFields } from "@/lib/filters/order-filters";

function concludedOrderFilterFields(
  order: ConcludedOrderItem,
): OrderFilterFields {
  return {
    clientName: order.clientName,
    number: order.number,
    budgetReference: order.budgetReference,
    priority: order.priority,
    scheduledDate: order.scheduledDate,
    displayNumber: order.displayNumber,
  };
}

type ConcludedOrderIndexProps = {
  orders: ConcludedOrderItem[];
};

export function ConcludedOrderIndex({ orders }: ConcludedOrderIndexProps) {
  return (
    <FilteredOrderList
      orders={orders}
      emptyMessage="Nenhum serviço concluído no momento."
      filterAriaLabel="Filtros de concluídos"
      idPrefix="concluded"
      paginationItemLabel="serviços"
      getFilterFields={concludedOrderFilterFields}
      renderItem={(order) => <ConcludedOrderCard order={order} />}
    />
  );
}
