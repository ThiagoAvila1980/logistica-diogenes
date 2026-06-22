import { isCompleteBrDate, parseBrDate } from "@/lib/date-format";
import {
  countActiveOrderFilters,
  DEFAULT_ORDER_FILTERS,
  filterOrderList,
  matchesOrderFilters,
  type OrderFilterFields,
  type OrderFilters,
} from "@/lib/filters/order-filters";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import { getKanbanPhaseIdsForOrder } from "@/lib/kanban/phase-placement";
import { getOrderDisplayNumber } from "@/lib/order-display";
import type { SlaStatus } from "@/components/reports/sla-badge";

export type ReportStageFilter = {
  stage: "all" | string;
};

export type ReportSlaFilter = {
  sla: "all" | SlaStatus;
};

export type ReportRoleFilter = {
  role: "all" | string;
};

export type StageOrderReportFilters = OrderFilters & ReportStageFilter;

export type BacklogReportFilters = StageOrderReportFilters & ReportSlaFilter;

export type TeamReportFilters = {
  search: string;
  role: ReportRoleFilter["role"];
};

export type ProductsReportFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_PRODUCTS_REPORT_FILTERS: ProductsReportFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
};

export function countProductsReportFilters(filters: ProductsReportFilters): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (isCompleteBrDate(filters.dateFrom)) count++;
  if (isCompleteBrDate(filters.dateTo)) count++;
  return count;
}

export function hasProductsReportFilters(filters: ProductsReportFilters): boolean {
  return countProductsReportFilters(filters) > 0;
}

export type LogisticsReportFilters = {
  search: string;
  dateFrom: string;
  dateTo: string;
};

export const DEFAULT_STAGE_ORDER_REPORT_FILTERS: StageOrderReportFilters = {
  ...DEFAULT_ORDER_FILTERS,
  stage: "all",
};

export const DEFAULT_BACKLOG_REPORT_FILTERS: BacklogReportFilters = {
  ...DEFAULT_STAGE_ORDER_REPORT_FILTERS,
  sla: "all",
};

export const DEFAULT_TEAM_REPORT_FILTERS: TeamReportFilters = {
  search: "",
  role: "all",
};

export const DEFAULT_LOGISTICS_REPORT_FILTERS: LogisticsReportFilters = {
  search: "",
  dateFrom: "",
  dateTo: "",
};

export function countStageOrderReportFilters(
  filters: StageOrderReportFilters,
): number {
  let count = countActiveOrderFilters(filters);
  if (filters.stage !== "all") count++;
  return count;
}

export function hasStageOrderReportFilters(
  filters: StageOrderReportFilters,
): boolean {
  return countStageOrderReportFilters(filters) > 0;
}

export function countBacklogReportFilters(filters: BacklogReportFilters): number {
  let count = countStageOrderReportFilters(filters);
  if (filters.sla !== "all") count++;
  return count;
}

export function hasBacklogReportFilters(filters: BacklogReportFilters): boolean {
  return countBacklogReportFilters(filters) > 0;
}

export function countTeamReportFilters(filters: TeamReportFilters): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (filters.role !== "all") count++;
  return count;
}

export function hasTeamReportFilters(filters: TeamReportFilters): boolean {
  return countTeamReportFilters(filters) > 0;
}

export function countLogisticsReportFilters(
  filters: LogisticsReportFilters,
): number {
  let count = 0;
  if (filters.search.trim()) count++;
  if (isCompleteBrDate(filters.dateFrom)) count++;
  if (isCompleteBrDate(filters.dateTo)) count++;
  return count;
}

export function hasLogisticsReportFilters(
  filters: LogisticsReportFilters,
): boolean {
  return countLogisticsReportFilters(filters) > 0;
}

export function matchesKanbanStage(
  order: KanbanOrderItem,
  stage: string,
): boolean {
  if (stage === "all") return true;
  return getKanbanPhaseIdsForOrder(order).includes(stage);
}

export function kanbanOrderFilterFields(
  order: KanbanOrderItem,
): OrderFilterFields {
  return {
    clientName: order.clientName,
    number: order.number,
    budgetReference: order.budgetReference,
    priority: order.priority,
    scheduledDate: order.scheduledDate,
    displayNumber: getOrderDisplayNumber(order),
  };
}

export function filterKanbanOrdersForReport(
  orders: KanbanOrderItem[],
  filters: StageOrderReportFilters,
): KanbanOrderItem[] {
  const orderFiltered = filterOrderList(orders, filters, kanbanOrderFilterFields);
  if (filters.stage === "all") return orderFiltered;
  return orderFiltered.filter((order) =>
    matchesKanbanStage(order, filters.stage),
  );
}

export function matchesDateRange(
  date: Date | string | null | undefined,
  dateFrom: string,
  dateTo: string,
): boolean {
  const hasDateFrom = isCompleteBrDate(dateFrom);
  const hasDateTo = isCompleteBrDate(dateTo);
  if (!hasDateFrom && !hasDateTo) return true;
  if (!date) return false;

  const day = startOfDay(new Date(date));

  if (hasDateFrom) {
    const fromDate = parseBrDate(dateFrom);
    if (fromDate && day < startOfDay(fromDate)) return false;
  }

  if (hasDateTo) {
    const toDate = parseBrDate(dateTo);
    if (toDate && day > startOfDay(toDate)) return false;
  }

  return true;
}

export function matchesTextSearch(
  candidates: Array<string | null | undefined>,
  query: string,
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const normalizedQuery = normalizeSearchText(trimmed);
  return candidates.some((value) =>
    normalizeSearchText(value ?? "").includes(normalizedQuery),
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

export function filterBacklogRows<
  T extends {
    displayNumber: string;
    clientName: string;
    priority: string;
    phaseId: string;
    slaStatus: SlaStatus;
    enteredStageAt: Date | null;
    scheduledDate?: Date | null;
  },
>(rows: T[], filters: BacklogReportFilters): T[] {
  return rows.filter((row) => {
    if (
      !matchesOrderFilters(
        {
          clientName: row.clientName,
          number: row.displayNumber,
          budgetReference: row.displayNumber,
          priority: row.priority as "normal" | "alta" | "urgente",
          scheduledDate: row.scheduledDate ?? row.enteredStageAt,
          displayNumber: row.displayNumber,
        },
        filters,
      )
    ) {
      return false;
    }
    if (filters.stage !== "all" && row.phaseId !== filters.stage) return false;
    if (filters.sla !== "all" && row.slaStatus !== filters.sla) return false;
    if (
      !matchesDateRange(
        row.enteredStageAt,
        filters.dateFrom,
        filters.dateTo,
      )
    ) {
      return false;
    }
    return true;
  });
}

export function filterTeamMembers<
  T extends { name: string; roles: string[] },
>(members: T[], filters: TeamReportFilters): T[] {
  return members.filter((member) => {
    if (!matchesTextSearch([member.name], filters.search)) return false;
    if (filters.role !== "all" && !member.roles.includes(filters.role)) {
      return false;
    }
    return true;
  });
}

export { matchesOrderFilters, DEFAULT_ORDER_FILTERS };
