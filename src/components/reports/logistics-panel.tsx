"use client";

import { useMemo, useState } from "react";
import { Truck, Package, AlertCircle } from "lucide-react";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import {
  computeLogisticsReport,
  reviveLogisticsReportPayload,
  type LogisticsReportPayload,
} from "@/lib/reports/logistics-compute";
import {
  countLogisticsReportFilters,
  DEFAULT_LOGISTICS_REPORT_FILTERS,
  type LogisticsReportFilters,
} from "@/lib/reports/report-filters";

type LogisticsPanelProps = {
  payload: LogisticsReportPayload;
};

export function LogisticsPanel({ payload: rawPayload }: LogisticsPanelProps) {
  const payload = useMemo(
    () => reviveLogisticsReportPayload(rawPayload),
    [rawPayload],
  );
  const [filters, setFilters] = useState<LogisticsReportFilters>(
    DEFAULT_LOGISTICS_REPORT_FILTERS,
  );

  const data = useMemo(
    () => computeLogisticsReport(payload, filters),
    [payload, filters],
  );

  const totalDeliveries = data.vehicles.reduce((s, v) => s + v.totalDeliveries, 0);
  const completedDeliveries = data.vehicles.reduce(
    (s, v) => s + v.completedDeliveries,
    0,
  );

  const vehicleBarData = data.vehicles
    .filter((v) => v.totalDeliveries > 0)
    .map((v) => ({ label: v.plate, value: v.totalDeliveries }));

  const driverBarData = data.drivers.map((d) => ({
    label: d.name.split(" ")[0] ?? d.name,
    value: d.totalDeliveries,
  }));

  const activeCount = countLogisticsReportFilters(filters);

  return (
    <div className="space-y-6">
      <ReportFiltersBar
        panelId="logistics-report-filters"
        activeCount={activeCount}
        totalCount={payload.deliveries.length}
        filteredCount={data.substepStats[0]?.total ?? 0}
        onClear={() => setFilters(DEFAULT_LOGISTICS_REPORT_FILTERS)}
        config={{
          search: {
            placeholder: "Motorista, veículo ou placa",
            value: filters.search,
            onChange: (search) => setFilters((current) => ({ ...current, search })),
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
          label="Total de entregas"
          value={totalDeliveries}
          icon={Truck}
          description="no recorte filtrado"
        />
        <KpiCard
          label="Entregas concluídas"
          value={completedDeliveries}
          icon={Package}
          description={
            totalDeliveries > 0
              ? `${Math.round((completedDeliveries / totalDeliveries) * 100)}% do total`
              : "sem dados"
          }
        />
        <KpiCard
          label="Aguardando transporte"
          value={data.pendingTransport}
          icon={AlertCircle}
          description="OS na fila de transporte"
        />
      </div>

      <div className="rounded-xl border border-primary/10 bg-card shadow-(--shadow-card)">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Conclusão de sub-etapas de transporte
          </h3>
        </div>
        <div className="divide-y divide-border">
          {data.substepStats.map((s) => (
            <div key={s.label} className="flex items-center gap-4 px-4 py-3">
              <span className="w-44 shrink-0 text-sm font-medium">{s.label}</span>
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {s.done}/{s.total} ({s.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {vehicleBarData.length > 0 && (
          <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Entregas por veículo
            </h3>
            <ReportBarChart
              data={vehicleBarData}
              valueLabel="Entregas"
              height={220}
            />
          </div>
        )}
        {driverBarData.length > 0 && (
          <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Entregas por motorista
            </h3>
            <ReportBarChart
              data={driverBarData}
              valueLabel="Entregas"
              height={220}
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-primary/10 bg-card shadow-(--shadow-card)">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Veículos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-semibold">Veículo</th>
                  <th className="px-4 py-2 text-left font-semibold">Placa</th>
                  <th className="px-4 py-2 text-right font-semibold">Total</th>
                  <th className="px-4 py-2 text-right font-semibold">Concluídas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.vehicles.filter((v) => v.totalDeliveries > 0).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Sem dados para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  data.vehicles
                    .filter((v) => v.totalDeliveries > 0)
                    .map((v) => (
                      <tr key={v.vehicleId} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{v.description}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.plate}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{v.totalDeliveries}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{v.completedDeliveries}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-primary/10 bg-card shadow-(--shadow-card)">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Motoristas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 text-left font-semibold">Nome</th>
                  <th className="px-4 py-2 text-right font-semibold">Total</th>
                  <th className="px-4 py-2 text-right font-semibold">Concluídas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.drivers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      Sem dados para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  data.drivers.map((d) => (
                    <tr key={d.driverId} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.totalDeliveries}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{d.completedDeliveries}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
