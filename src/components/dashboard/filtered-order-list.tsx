"use client";

import { useMemo, useState, type ReactNode } from "react";
import { OrderFiltersBar } from "@/components/dashboard/order-filters-bar";
import { ORDER_INDEX_GRID_CLASS } from "@/lib/ui/order-index-grid";
import {
  DEFAULT_ORDER_FILTERS,
  filterOrderList,
  hasActiveOrderFilters,
  type OrderFilterFields,
  type OrderFilters,
} from "@/lib/filters/order-filters";

type FilteredOrderListProps<T extends { id: string }> = {
  orders: T[];
  emptyMessage: string;
  filterAriaLabel: string;
  idPrefix: string;
  getFilterFields: (order: T) => OrderFilterFields;
  renderItem: (order: T) => ReactNode;
};

export function FilteredOrderList<T extends { id: string }>({
  orders,
  emptyMessage,
  filterAriaLabel,
  idPrefix,
  getFilterFields,
  renderItem,
}: FilteredOrderListProps<T>) {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_ORDER_FILTERS);

  const filteredOrders = useMemo(
    () => filterOrderList(orders, filters, getFilterFields),
    [orders, filters, getFilterFields],
  );

  const listEmptyMessage = hasActiveOrderFilters(filters)
    ? "Nenhuma medição corresponde aos filtros."
    : emptyMessage;

  return (
    <div className="space-y-2">
      <OrderFiltersBar
        filters={filters}
        onChange={setFilters}
        totalCount={orders.length}
        filteredCount={filteredOrders.length}
        ariaLabel={filterAriaLabel}
        idPrefix={idPrefix}
      />

      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary/20 bg-card p-8 text-center premium-card">
          <p className="text-sm text-muted-foreground">{listEmptyMessage}</p>
        </div>
      ) : (
        <ul className={ORDER_INDEX_GRID_CLASS}>
          {filteredOrders.map((order) => (
            <li key={order.id} className="min-h-0">
              {renderItem(order)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
