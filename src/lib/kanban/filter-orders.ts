import type { KanbanOrderItem } from "@/lib/data/kanban";
import { isCompleteBrDate, parseBrDate } from "@/lib/date-format";
import { getOrderDisplayNumber } from "@/lib/order-display";

export type KanbanFilters = {
  search: string;
  priority: "all" | KanbanOrderItem["priority"];
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_KANBAN_FILTERS: KanbanFilters = {
  search: "",
  priority: "all",
  dateFrom: "",
  dateTo: "",
};

export function countActiveKanbanFilters(filters: KanbanFilters): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.priority !== "all") count++;
  if (isCompleteBrDate(filters.dateFrom)) count++;
  if (isCompleteBrDate(filters.dateTo)) count++;
  return count;
}

export function hasActiveKanbanFilters(filters: KanbanFilters): boolean {
  return countActiveKanbanFilters(filters) > 0;
}

export function filterKanbanOrders(
  orders: KanbanOrderItem[],
  filters: KanbanFilters,
): KanbanOrderItem[] {
  return orders.filter((os) => matchesKanbanFilters(os, filters));
}

function matchesKanbanFilters(
  os: KanbanOrderItem,
  filters: KanbanFilters,
): boolean {
  if (!matchesSearch(os, filters.search)) return false;

  if (filters.priority !== "all" && os.priority !== filters.priority) {
    return false;
  }

  const hasDateFrom = isCompleteBrDate(filters.dateFrom);
  const hasDateTo = isCompleteBrDate(filters.dateTo);

  if (!hasDateFrom && !hasDateTo) return true;
  if (!os.scheduledDate) return false;

  const day = startOfDay(new Date(os.scheduledDate));

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

function matchesSearch(os: KanbanOrderItem, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const normalizedQuery = normalizeSearchText(trimmed);
  const candidates = [
    os.clientName,
    getOrderDisplayNumber(os),
    os.number,
    os.budgetReference ?? "",
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
