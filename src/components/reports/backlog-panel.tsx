"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { SlaBadge } from "@/components/reports/sla-badge";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import { formatBrDate } from "@/lib/date-format";
import type { BacklogSummary } from "@/lib/data/backlog-report";
import type { SlaStatus } from "@/components/reports/sla-badge";
import { KANBAN_PHASES } from "@/lib/kanban/column-groups";
import {
  countBacklogReportFilters,
  DEFAULT_BACKLOG_REPORT_FILTERS,
  filterBacklogRows,
  type BacklogReportFilters,
} from "@/lib/reports/report-filters";
import { getReportPhaseLabel } from "@/lib/reports/phase-counts";

const SLA_LABELS: Record<SlaStatus, string> = {
  ok: "No prazo",
  warning: "Atenção",
  critical: "Crítico",
};

type BacklogPanelProps = {
  data: BacklogSummary;
};

export function BacklogPanel({ data }: BacklogPanelProps) {
  const [filters, setFilters] = useState<BacklogReportFilters>(
    DEFAULT_BACKLOG_REPORT_FILTERS,
  );

  const filteredRows = useMemo(
    () => filterBacklogRows(data.rows, filters),
    [data.rows, filters],
  );

  const byPhase = useMemo(
    () =>
      KANBAN_PHASES.map((p) => ({
        phaseId: p.id,
        phaseTitle: getReportPhaseLabel(p.id, p.shortTitle),
        count: filteredRows.filter((r) => r.phaseId === p.id).length,
      })),
    [filteredRows],
  );

  const avgDaysByPhase = useMemo(() => {
    const phaseAccum = new Map<
      string,
      { normal: number[]; alta: number[]; urgente: number[] }
    >();
    for (const p of KANBAN_PHASES) {
      phaseAccum.set(p.id, { normal: [], alta: [], urgente: [] });
    }
    for (const row of filteredRows) {
      const acc = phaseAccum.get(row.phaseId);
      if (acc) acc[row.priority].push(row.daysInCurrentStage);
    }
    const avg = (arr: number[]) =>
      arr.length === 0 ? 0 : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

    return KANBAN_PHASES.map((p) => {
      const acc = phaseAccum.get(p.id) ?? { normal: [], alta: [], urgente: [] };
      return {
        phaseId: p.id,
        phaseTitle: getReportPhaseLabel(p.id, p.shortTitle),
        avgDays: {
          normal: avg(acc.normal),
          alta: avg(acc.alta),
          urgente: avg(acc.urgente),
        },
      };
    });
  }, [filteredRows]);

  const criticalCount = filteredRows.filter((r) => r.slaStatus === "critical").length;
  const warningCount = filteredRows.filter((r) => r.slaStatus === "warning").length;
  const okCount = filteredRows.filter((r) => r.slaStatus === "ok").length;
  const activeCount = countBacklogReportFilters(filters);

  return (
    <div className="space-y-6">
      <ReportFiltersBar
        panelId="backlog-report-filters"
        activeCount={activeCount}
        totalCount={data.rows.length}
        filteredCount={filteredRows.length}
        onClear={() => setFilters(DEFAULT_BACKLOG_REPORT_FILTERS)}
        config={{
          search: {
            placeholder: "Cliente ou nº orçamento",
            value: filters.search,
            onChange: (search) => setFilters((current) => ({ ...current, search })),
          },
          priority: {
            value: filters.priority,
            onChange: (priority) =>
              setFilters((current) => ({ ...current, priority })),
          },
          stage: {
            value: filters.stage,
            onChange: (stage) => setFilters((current) => ({ ...current, stage })),
          },
          sla: {
            value: filters.sla,
            onChange: (sla) => setFilters((current) => ({ ...current, sla })),
          },
          dateRange: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            onChange: (patch) =>
              setFilters((current) => ({ ...current, ...patch })),
          },
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Crítico (vencido)"
          value={criticalCount}
          icon={AlertTriangle}
          description="OS fora do prazo acordado"
        />
        <KpiCard
          label="Atenção"
          value={warningCount}
          description="OS próximas ao limite"
        />
        <KpiCard
          label="No prazo"
          value={okCount}
          description="OS dentro do prazo esperado"
        />
      </div>

      <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          OS em aberto por fase
        </h3>
        <ReportBarChart
          data={byPhase.map((p) => ({ label: p.phaseTitle, value: p.count }))}
          valueLabel="OS"
          height={200}
        />
      </div>

      <div className="rounded-xl border border-primary/10 bg-card overflow-x-auto shadow-(--shadow-card)">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Tempo médio em cada fase (dias) por prioridade
          </h3>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left font-semibold">Fase</th>
              <th className="px-4 py-2 text-right font-semibold">Normal</th>
              <th className="px-4 py-2 text-right font-semibold">Alta</th>
              <th className="px-4 py-2 text-right font-semibold">Urgente</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {avgDaysByPhase.map((phase) => (
              <tr key={phase.phaseId} className="hover:bg-muted/20">
                <td className="px-4 py-2 font-medium">{phase.phaseTitle}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {phase.avgDays.normal > 0 ? `${phase.avgDays.normal} dias` : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {phase.avgDays.alta > 0 ? `${phase.avgDays.alta} dias` : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {phase.avgDays.urgente > 0 ? `${phase.avgDays.urgente} dias` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-primary/10 bg-card shadow-(--shadow-card)">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            OS em aberto — detalhamento
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-left font-semibold">Nº / Ref.</th>
                <th className="px-4 py-3 text-left font-semibold">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold">Fase</th>
                <th className="px-4 py-3 text-left font-semibold">Etapa</th>
                <th className="px-4 py-3 text-left font-semibold">Prioridade</th>
                <th className="px-4 py-3 text-right font-semibold">Dias na etapa</th>
                <th className="px-4 py-3 text-left font-semibold">Prazo</th>
                <th className="px-4 py-3 text-left font-semibold">Entrou em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Nenhuma OS encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {row.displayNumber}
                    </td>
                    <td className="px-4 py-3">{row.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.phaseTitle}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.etapaLabel}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={row.priority} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {row.daysInCurrentStage} dias
                    </td>
                    <td className="px-4 py-3">
                      <SlaBadge
                        status={row.slaStatus}
                        label={SLA_LABELS[row.slaStatus]}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.enteredStageAt
                        ? formatBrDate(row.enteredStageAt)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
