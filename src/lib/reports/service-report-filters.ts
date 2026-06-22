import {
  countActiveOrderFilters,
  DEFAULT_ORDER_FILTERS,
  filterOrderList,
  hasActiveOrderFilters,
  matchesOrderFilters,
  type OrderFilters,
} from "@/lib/filters/order-filters";
import {
  matchesServiceReportStage,
  type ServiceJourneyRow,
} from "@/lib/reports/service-journey";

export type ServiceReportStageFilter = "all" | string;

export type ServiceReportFilters = OrderFilters & {
  stage: ServiceReportStageFilter;
};

export const DEFAULT_SERVICE_REPORT_FILTERS: ServiceReportFilters = {
  ...DEFAULT_ORDER_FILTERS,
  stage: "all",
};

export function countActiveServiceReportFilters(
  filters: ServiceReportFilters,
): number {
  let count = countActiveOrderFilters(filters);
  if (filters.stage !== "all") count++;
  return count;
}

export function hasActiveServiceReportFilters(
  filters: ServiceReportFilters,
): boolean {
  return countActiveServiceReportFilters(filters) > 0;
}

export function filterServiceJourneyRows(
  rows: ServiceJourneyRow[],
  filters: ServiceReportFilters,
): ServiceJourneyRow[] {
  const orderFiltered = filterOrderList(rows, filters, (row) => ({
    clientName: row.clientName,
    number: row.number,
    budgetReference: row.budgetReference,
    priority: row.priority,
    scheduledDate: row.scheduledDate,
    displayNumber: row.displayNumber,
  }));

  if (filters.stage === "all") return orderFiltered;

  return orderFiltered.filter((row) =>
    matchesServiceReportStage(row, filters.stage),
  );
}

export function parseServiceReportFiltersFromSearchParams(
  params: URLSearchParams,
): ServiceReportFilters {
  const priority = params.get("priority");
  const validPriority =
    priority === "normal" ||
    priority === "alta" ||
    priority === "urgente"
      ? priority
      : "all";

  return {
    search: params.get("search") ?? "",
    priority: validPriority,
    stage: params.get("stage") ?? "all",
    dateFrom: params.get("dateFrom") ?? "",
    dateTo: params.get("dateTo") ?? "",
  };
}

export function buildServiceReportPdfUrl(filters: ServiceReportFilters): string {
  const params = new URLSearchParams();
  const trimmedSearch = filters.search.trim();
  if (trimmedSearch) params.set("search", trimmedSearch);
  if (filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.stage !== "all") params.set("stage", filters.stage);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const query = params.toString();
  return query
    ? `/api/reports/services/pdf?${query}`
    : "/api/reports/services/pdf";
}

export { hasActiveOrderFilters, matchesOrderFilters };
