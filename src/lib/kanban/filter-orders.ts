import type { KanbanOrderItem } from "@/lib/data/kanban";
import {
  countActiveOrderFilters,
  DEFAULT_ORDER_FILTERS,
  filterOrderList,
  hasActiveOrderFilters,
  type OrderFilters,
} from "@/lib/filters/order-filters";

export type KanbanFilters = OrderFilters;

export const DEFAULT_KANBAN_FILTERS = DEFAULT_ORDER_FILTERS;

export const countActiveKanbanFilters = countActiveOrderFilters;

export const hasActiveKanbanFilters = hasActiveOrderFilters;

export function filterKanbanOrders(
  orders: KanbanOrderItem[],
  filters: KanbanFilters,
): KanbanOrderItem[] {
  return filterOrderList(orders, filters, (os) => ({
    clientName: os.clientName,
    number: os.number,
    budgetReference: os.budgetReference,
    priority: os.priority,
    scheduledDate: os.scheduledDate,
  }));
}
