"use client";

import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import {
  countActiveServiceReportFilters,
  DEFAULT_SERVICE_REPORT_FILTERS,
  type ServiceReportFilters,
} from "@/lib/reports/service-report-filters";

type ServiceReportFiltersBarProps = {
  filters: ServiceReportFilters;
  onChange: (filters: ServiceReportFilters) => void;
  totalCount: number;
  filteredCount: number;
};

export function ServiceReportFiltersBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: ServiceReportFiltersBarProps) {
  return (
    <ReportFiltersBar
      panelId="service-report-filters"
      activeCount={countActiveServiceReportFilters(filters)}
      totalCount={totalCount}
      filteredCount={filteredCount}
      onClear={() => onChange(DEFAULT_SERVICE_REPORT_FILTERS)}
      config={{
        search: {
          placeholder: "Cliente ou nº orçamento",
          value: filters.search,
          onChange: (search) => onChange({ ...filters, search }),
        },
        priority: {
          value: filters.priority,
          onChange: (priority) => onChange({ ...filters, priority }),
        },
        stage: {
          value: filters.stage,
          onChange: (stage) => onChange({ ...filters, stage }),
        },
        dateRange: {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          onChange: (patch) => onChange({ ...filters, ...patch }),
        },
      }}
    />
  );
}
