import type { KanbanOrderItem } from "@/lib/data/kanban";

export type KanbanFilters = {
  priority: "all" | KanbanOrderItem["priority"];
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_KANBAN_FILTERS: KanbanFilters = {
  priority: "all",
  dateFrom: "",
  dateTo: "",
};

export function filterKanbanOrders(
  orders: KanbanOrderItem[],
  filters: KanbanFilters,
): KanbanOrderItem[] {
  return orders.filter((os) => {
    if (filters.priority !== "all" && os.priority !== filters.priority) {
      return false;
    }

    if (!filters.dateFrom && !filters.dateTo) return true;
    if (!os.scheduledDate) return false;

    const day = startOfDay(new Date(os.scheduledDate));

    if (filters.dateFrom) {
      const from = startOfDay(parseInputDate(filters.dateFrom));
      if (day < from) return false;
    }

    if (filters.dateTo) {
      const to = startOfDay(parseInputDate(filters.dateTo));
      if (day > to) return false;
    }

    return true;
  });
}

function parseInputDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
