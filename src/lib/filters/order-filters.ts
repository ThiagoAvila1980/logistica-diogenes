import { isCompleteBrDate, parseBrDate } from "@/lib/date-format";
import { getOrderDisplayNumber } from "@/lib/order-display";

export type OrderPriority = "normal" | "alta" | "urgente";

export type OrderFilters = {
  search: string;
  priority: "all" | OrderPriority;
  dateFrom: string;
  dateTo: string;
};

export type OrderFilterFields = {
  clientName: string;
  number: string;
  budgetReference: string | null;
  priority: OrderPriority;
  scheduledDate: Date | string | null;
  /** Número exibido (opcional; senão usa getOrderDisplayNumber). */
  displayNumber?: string;
};

export const DEFAULT_ORDER_FILTERS: OrderFilters = {
  search: "",
  priority: "all",
  dateFrom: "",
  dateTo: "",
};

export function countActiveOrderFilters(filters: OrderFilters): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.priority !== "all") count++;
  if (isCompleteBrDate(filters.dateFrom)) count++;
  if (isCompleteBrDate(filters.dateTo)) count++;
  return count;
}

export function hasActiveOrderFilters(filters: OrderFilters): boolean {
  return countActiveOrderFilters(filters) > 0;
}

export function filterOrderList<T>(
  orders: T[],
  filters: OrderFilters,
  getFields: (order: T) => OrderFilterFields,
): T[] {
  return orders.filter((order) => matchesOrderFilters(getFields(order), filters));
}

export function matchesOrderFilters(
  order: OrderFilterFields,
  filters: OrderFilters,
): boolean {
  if (!matchesSearch(order, filters.search)) return false;

  if (filters.priority !== "all" && order.priority !== filters.priority) {
    return false;
  }

  const hasDateFrom = isCompleteBrDate(filters.dateFrom);
  const hasDateTo = isCompleteBrDate(filters.dateTo);

  if (!hasDateFrom && !hasDateTo) return true;
  if (!order.scheduledDate) return false;

  const day = startOfDay(new Date(order.scheduledDate));

  if (hasDateFrom) {
    const fromDate = parseBrDate(filters.dateFrom);
    if (!fromDate) return true;
    if (day < startOfDay(fromDate)) return false;
  }

  if (hasDateTo) {
    const toDate = parseBrDate(filters.dateTo);
    if (!toDate) return true;
    if (day > startOfDay(toDate)) return false;
  }

  return true;
}

function matchesSearch(order: OrderFilterFields, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const normalizedQuery = normalizeSearchText(trimmed);
  const candidates = [
    order.clientName,
    order.displayNumber ?? getOrderDisplayNumber(order),
    order.number,
    order.budgetReference ?? "",
  ];

  return candidates.some((value) =>
    normalizeSearchText(value).includes(normalizedQuery),
  );
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
