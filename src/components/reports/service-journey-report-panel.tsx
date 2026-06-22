"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { ServiceReportFiltersBar } from "@/components/reports/service-report-filters-bar";
import { ServiceJourneyTimeline } from "@/components/reports/service-journey-timeline";
import { formatBrDate, formatBrDateTime } from "@/lib/date-format";
import {
  DEFAULT_SERVICE_REPORT_FILTERS,
  buildServiceReportPdfUrl,
  filterServiceJourneyRows,
  type ServiceReportFilters,
} from "@/lib/reports/service-report-filters";
import type { ServiceJourneyRow } from "@/lib/reports/service-journey";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type ServiceJourneyReportPanelProps = {
  rows: ServiceJourneyRow[];
  generatedAt: string;
};

export function ServiceJourneyReportPanel({
  rows,
  generatedAt,
}: ServiceJourneyReportPanelProps) {
  const [filters, setFilters] = useState<ServiceReportFilters>(
    DEFAULT_SERVICE_REPORT_FILTERS,
  );
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(
    () => filterServiceJourneyRows(rows, filters),
    [rows, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const paginatedRowIds = useMemo(
    () => new Set(paginatedRows.map((row) => row.id)),
    [paginatedRows],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleFiltersChange(next: ServiceReportFilters) {
    setFilters(next);
    setPage(1);
  }

  function handlePrint() {
    window.print();
  }

  function handleExportPdf() {
    window.open(buildServiceReportPdfUrl(filters), "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={handleExportPdf}
        >
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="no-print">
        <ServiceReportFiltersBar
          filters={filters}
          onChange={handleFiltersChange}
          totalCount={rows.length}
          filteredCount={filteredRows.length}
        />
      </div>

      <div className="report-print-root rounded-lg border bg-card shadow-sm">
        <div className="border-b px-4 py-3 print:border-border">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Relatório de jornada dos serviços
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Visão consolidada das etapas percorridas por cada serviço no
                pipeline operacional.
              </p>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <p>Gerado em {formatBrDateTime(new Date(generatedAt))}</p>
              <p>
                Exibindo {filteredRows.length} de {rows.length} serviços
                {filteredRows.length > PAGE_SIZE && (
                  <>
                    {" "}
                    · Página {safePage} de {totalPages}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Nº / Orçamento</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Prioridade</th>
                <th className="px-4 py-3 font-semibold">Agendamento</th>
                <th className="px-4 py-3 font-semibold">Etapa atual</th>
                <th className="min-w-[16rem] px-4 py-3 font-semibold">
                  Jornada
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum serviço encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "align-top hover:bg-muted/20",
                      !paginatedRowIds.has(row.id) && "hidden print:table-row",
                    )}
                  >
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {row.displayNumber}
                    </td>
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={row.priority} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {row.scheduledDate
                        ? formatBrDate(row.scheduledDate)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.currentPhaseTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.currentStatusLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ServiceJourneyTimeline phases={row.phases} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > PAGE_SIZE && (
          <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredRows.length)} de{" "}
              {filteredRows.length} serviços
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="min-w-20 text-center text-xs text-muted-foreground">
                {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
