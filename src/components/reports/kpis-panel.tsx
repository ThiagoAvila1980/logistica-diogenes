"use client";

import { useMemo, useState } from "react";
import {
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import {
  computeKpiSummary,
  reviveKpiReportPayload,
  type KpiReportPayload,
} from "@/lib/reports/kpis-compute";
import {
  countStageOrderReportFilters,
  DEFAULT_STAGE_ORDER_REPORT_FILTERS,
  filterKanbanOrdersForReport,
  type StageOrderReportFilters,
} from "@/lib/reports/report-filters";

const PRIORITY_COLORS: Record<string, string> = {
  normal: "hsl(var(--muted-foreground))",
  alta: "hsl(var(--warning-foreground))",
  urgente: "hsl(var(--destructive))",
};

const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

type KpisPanelProps = {
  payload: KpiReportPayload;
};

export function KpisPanel({ payload: rawPayload }: KpisPanelProps) {
  const payload = useMemo(() => reviveKpiReportPayload(rawPayload), [rawPayload]);
  const [filters, setFilters] = useState<StageOrderReportFilters>(
    DEFAULT_STAGE_ORDER_REPORT_FILTERS,
  );

  const filteredOrders = useMemo(
    () => filterKanbanOrdersForReport(payload.orders, filters),
    [payload.orders, filters],
  );

  const data = useMemo(
    () => computeKpiSummary(payload, filters),
    [payload, filters],
  );

  const activeCount = countStageOrderReportFilters(filters);
  const concludedRate =
    data.totalOrders === 0
      ? 0
      : Math.round((data.concludedOrders / data.totalOrders) * 100);

  return (
    <div className="space-y-6">
      <ReportFiltersBar
        panelId="kpis-report-filters"
        activeCount={activeCount}
        totalCount={payload.orders.length}
        filteredCount={filteredOrders.length}
        onClear={() => setFilters(DEFAULT_STAGE_ORDER_REPORT_FILTERS)}
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
          dateRange: {
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            onChange: (patch) =>
              setFilters((current) => ({ ...current, ...patch })),
          },
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total de OS"
          value={data.totalOrders}
          icon={BarChart2}
          description="considerando os filtros aplicados"
        />
        <KpiCard
          label="Em andamento"
          value={data.inProgressOrders}
          icon={Activity}
          description="OS abertas no fluxo operacional"
        />
        <KpiCard
          label="Concluídas"
          value={data.concludedOrders}
          icon={CheckCircle2}
          description={`${concludedRate}% do total com filtros aplicados`}
        />
        <KpiCard
          label="Urgentes em aberto"
          value={data.urgentOpenOrders}
          icon={AlertTriangle}
          description="requerem atenção imediata"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Criadas (últimos 30 dias)"
          value={data.createdLast30Days}
          icon={TrendingUp}
          description="considerando os filtros aplicados"
        />
        <KpiCard
          label="Concluídas (últimos 30 dias)"
          value={data.concludedLast30Days}
          icon={CheckCircle2}
          description="considerando os filtros aplicados"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            OS por fase (atual)
          </h3>
          <ReportBarChart
            data={data.byPhase.map((p) => ({
              label: p.phaseTitle,
              value: p.count,
            }))}
            valueLabel="OS"
            height={220}
          />
        </div>

        <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            OS em aberto por prioridade
          </h3>
          <ReportBarChart
            data={data.byPriority.map((p) => ({
              label: PRIORITY_LABELS[p.priority] ?? p.priority,
              value: p.count,
              color: PRIORITY_COLORS[p.priority],
            }))}
            valueLabel="OS"
            height={220}
          />
        </div>

        <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            OS criadas por mês (últimos 6 meses)
          </h3>
          <ReportBarChart
            data={data.createdByMonth.map((m) => ({
              label: m.month,
              value: m.count,
            }))}
            valueLabel="Criadas"
            height={220}
          />
        </div>

        <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            OS concluídas por mês (últimos 6 meses)
          </h3>
          <ReportBarChart
            data={data.concludedByMonth.map((m) => ({
              label: m.month,
              value: m.count,
            }))}
            valueLabel="Concluídas"
            height={220}
          />
        </div>
      </div>

      <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
        <h3 className="mb-1 text-sm font-semibold text-foreground">
          Tempo médio em cada fase (horas)
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Calculado com base no histórico de transições registradas
        </p>
        <ReportBarChart
          data={data.avgTimeByPhase.map((p) => ({
            label: p.phaseTitle,
            value: p.avgHours,
          }))}
          valueLabel="horas"
          height={220}
        />
      </div>
    </div>
  );
}
