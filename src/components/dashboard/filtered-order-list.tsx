"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ListPagination } from "@/components/dashboard/list-pagination";
import { OrderFiltersBar } from "@/components/dashboard/order-filters-bar";
import { useOrderIndexPageSize } from "@/hooks/use-order-index-page-size";
import { ORDER_INDEX_GRID_CLASS, ORDER_INDEX_ROWS } from "@/lib/ui/order-index-grid";
import {
  DEFAULT_ORDER_FILTERS,
  filterOrderList,
  hasActiveOrderFilters,
  type OrderFilterFields,
  type OrderFilters,
} from "@/lib/filters/order-filters";

/** @deprecated Use paginação por linhas (`rows`) em FilteredOrderList. */
export const ORDER_INDEX_PAGE_SIZE = ORDER_INDEX_ROWS * 3;

type FilteredOrderListProps<T extends { id: string }> = {
  orders: T[];
  emptyMessage: string;
  filterAriaLabel: string;
  idPrefix: string;
  getFilterFields: (order: T) => OrderFilterFields;
  renderItem: (order: T) => ReactNode;
  /** Linhas de cards por página (padrão 4 × colunas do grid). */
  rows?: number;
  /** Tamanho fixo; se omitido, usa `rows` × colunas responsivas. */
  pageSize?: number;
  paginationItemLabel?: string;
};

export function FilteredOrderList<T extends { id: string }>({
  orders,
  emptyMessage,
  filterAriaLabel,
  idPrefix,
  getFilterFields,
  renderItem,
  rows = ORDER_INDEX_ROWS,
  pageSize: fixedPageSize,
  paginationItemLabel = "serviços",
}: FilteredOrderListProps<T>) {
  const responsivePageSize = useOrderIndexPageSize(rows);
  const pageSize = fixedPageSize ?? responsivePageSize;
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_ORDER_FILTERS);
  const [page, setPage] = useState(1);

  const filteredOrders = useMemo(
    () => filterOrderList(orders, filters, getFilterFields),
    [orders, filters, getFilterFields],
  );

  const totalPages = pageSize
    ? Math.max(1, Math.ceil(filteredOrders.length / pageSize))
    : 1;
  const safePage = Math.min(page, totalPages);

  const visibleOrders = useMemo(() => {
    if (!pageSize) return filteredOrders;
    const start = (safePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, pageSize, safePage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleFiltersChange(next: OrderFilters) {
    setFilters(next);
    setPage(1);
  }

  const listEmptyMessage = hasActiveOrderFilters(filters)
    ? "Nenhuma medição corresponde aos filtros."
    : emptyMessage;

  return (
    <div className="space-y-2">
      <OrderFiltersBar
        filters={filters}
        onChange={handleFiltersChange}
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
        <>
          <ul className={ORDER_INDEX_GRID_CLASS}>
            {visibleOrders.map((order) => (
              <li key={order.id} className="min-h-0">
                {renderItem(order)}
              </li>
            ))}
          </ul>

          {pageSize > 0 ? (
            <ListPagination
              page={safePage}
              pageSize={pageSize}
              totalItems={filteredOrders.length}
              onPageChange={setPage}
              itemLabel={paginationItemLabel}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
