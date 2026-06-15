"use client";

import { OrderFiltersBar } from "@/components/dashboard/order-filters-bar";
import type { KanbanFilters } from "@/lib/kanban/filter-orders";

type KanbanFiltersBarProps = {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
  totalCount: number;
  filteredCount: number;
};

export function KanbanFiltersBar(props: KanbanFiltersBarProps) {
  return (
    <OrderFiltersBar
      {...props}
      ariaLabel="Filtros do kanban"
      idPrefix="kanban"
    />
  );
}
