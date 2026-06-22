"use client";

import { useMemo, useState } from "react";
import { Package2 } from "lucide-react";
import { KpiCard } from "@/components/reports/kpi-card";
import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import type { RankedItem } from "@/lib/data/products-report";
import {
  computeProductsReport,
  countFilteredProductSources,
  reviveProductsReportPayload,
  type ProductsReportPayload,
} from "@/lib/reports/products-compute";
import {
  countProductsReportFilters,
  DEFAULT_PRODUCTS_REPORT_FILTERS,
  type ProductsReportFilters,
} from "@/lib/reports/report-filters";

type Tab = "cor" | "vidro" | "envidracamento" | "ambiente";

const TABS: { id: Tab; label: string }[] = [
  { id: "cor", label: "Cores" },
  { id: "vidro", label: "Tipo de vidro" },
  { id: "envidracamento", label: "Envidraçamento" },
  { id: "ambiente", label: "Ambientes" },
];

function RankedTable({ items }: { items: RankedItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2 text-left font-semibold">#</th>
            <th className="px-4 py-2 text-left font-semibold">Descrição</th>
            <th className="px-4 py-2 text-right font-semibold">Qtd. de vãos</th>
            <th className="px-4 py-2 text-right font-semibold">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                Sem dados para os filtros selecionados.
              </td>
            </tr>
          ) : (
            items.map((item, idx) => (
              <tr key={item.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="px-4 py-3 font-medium">{item.label}</td>
                <td className="px-4 py-3 text-right tabular-nums">{item.count}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {item.pct}%
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

type ProductsPanelProps = {
  payload: ProductsReportPayload;
};

export function ProductsPanel({ payload: rawPayload }: ProductsPanelProps) {
  const payload = useMemo(
    () => reviveProductsReportPayload(rawPayload),
    [rawPayload],
  );
  const [filters, setFilters] = useState<ProductsReportFilters>(
    DEFAULT_PRODUCTS_REPORT_FILTERS,
  );
  const [tab, setTab] = useState<Tab>("cor");

  const data = useMemo(
    () => computeProductsReport(payload, filters),
    [payload, filters],
  );

  const filteredSourceCount = useMemo(
    () => countFilteredProductSources(payload, filters),
    [payload, filters],
  );

  const tabData: Record<Tab, RankedItem[]> = {
    cor: data.byCor,
    vidro: data.byTipoVidro,
    envidracamento: data.byTipoEnvidracamento,
    ambiente: data.byAmbiente,
  };

  const activeData = tabData[tab];
  const barData = activeData.slice(0, 8).map((item) => ({
    label: item.label.length > 16 ? item.label.slice(0, 14) + "…" : item.label,
    value: item.count,
  }));

  const activeCount = countProductsReportFilters(filters);

  return (
    <div className="space-y-6">
      <ReportFiltersBar
        panelId="products-report-filters"
        activeCount={activeCount}
        totalCount={payload.sources.length}
        filteredCount={filteredSourceCount}
        onClear={() => setFilters(DEFAULT_PRODUCTS_REPORT_FILTERS)}
        config={{
          search: {
            placeholder: "Cliente ou nº orçamento",
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
          label="Total de vãos analisados"
          value={data.totalItems}
          icon={Package2}
          description="no recorte filtrado"
        />
        <KpiCard
          label="Tipos de cor utilizados"
          value={data.byCor.length}
          description="cores distintas"
        />
        <KpiCard
          label="Tipos de vidro utilizados"
          value={data.byTipoVidro.length}
          description="tipos distintos de vidro"
        />
      </div>

      <div className="rounded-xl border border-primary/10 bg-card shadow-(--shadow-card)">
        <div className="flex flex-wrap gap-0 border-b">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {barData.length > 0 && (
          <div className="p-5">
            <ReportBarChart
              data={barData}
              valueLabel="Vãos"
              height={220}
              layout={barData.length > 4 ? "vertical" : "horizontal"}
            />
          </div>
        )}

        <RankedTable items={activeData} />
      </div>
    </div>
  );
}
