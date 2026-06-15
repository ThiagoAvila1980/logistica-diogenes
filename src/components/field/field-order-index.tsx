"use client";

import { FieldOrderCardWithDelete } from "@/components/field/field-order-card-with-delete";
import { FilteredOrderList } from "@/components/dashboard/filtered-order-list";
import { serviceOrderFilterFields } from "@/lib/filters/service-order-fields";
import type { OrderListItem } from "@/lib/data/types";

type FieldOrderIndexProps = {
  orders: OrderListItem[];
  canDelete: boolean;
};

export function FieldOrderIndex({ orders, canDelete }: FieldOrderIndexProps) {
  return (
    <FilteredOrderList
      orders={orders}
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
