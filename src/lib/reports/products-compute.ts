import type { MeasurementLookups } from "@/lib/data/lookup-types";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { ProductsReportData, RankedItem } from "@/lib/data/products-report";
import {
  matchesDateRange,
  matchesTextSearch,
  DEFAULT_PRODUCTS_REPORT_FILTERS,
  type ProductsReportFilters,
} from "@/lib/reports/report-filters";

export type ProductsSourceOrder = {
  id: string;
  clientName: string;
  number: string;
  budgetReference: string | null;
  createdAt: Date;
  scheduledDate: Date | null;
  items: MeasurementLineItem[];
};

export type ProductsReportPayload = {
  sources: ProductsSourceOrder[];
  lookups: MeasurementLookups;
};

function rankItems(
  freqMap: Map<string, number>,
  labelMap: Map<string, string>,
  total: number,
): RankedItem[] {
  return [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, cnt]) => ({
      id,
      label: labelMap.get(id) ?? id,
      count: cnt,
      pct: total === 0 ? 0 : Math.round((cnt / total) * 100),
    }));
}

function filterProductSources(
  sources: ProductsSourceOrder[],
  filters: ProductsReportFilters,
): ProductsSourceOrder[] {
  return sources.filter((source) => {
    if (
      !matchesDateRange(source.createdAt, filters.dateFrom, filters.dateTo)
    ) {
      return false;
    }
    return matchesTextSearch(
      [source.clientName, source.number, source.budgetReference],
      filters.search,
    );
  });
}

export function countFilteredProductSources(
  payload: ProductsReportPayload,
  filters: ProductsReportFilters,
): number {
  return filterProductSources(payload.sources, filters).length;
}

export function computeProductsReport(
  payload: ProductsReportPayload,
  filters: ProductsReportFilters = DEFAULT_PRODUCTS_REPORT_FILTERS,
): ProductsReportData {
  const sources = filterProductSources(payload.sources, filters);
  const { lookups } = payload;

  const corMap = new Map(lookups.cores.map((c) => [c.id, c.descricao]));
  const vidroMap = new Map(lookups.tipoVidro.map((v) => [v.id, v.descricao]));
  const envMap = new Map(
    lookups.tipoEnvidracamento.map((e) => [e.id, e.descricao]),
  );
  const ambMap = new Map(lookups.ambientes.map((a) => [a.id, a.descricao]));

  const corFreq = new Map<string, number>();
  const vidroFreq = new Map<string, number>();
  const envFreq = new Map<string, number>();
  const ambFreq = new Map<string, number>();

  let totalItems = 0;

  for (const source of sources) {
    for (const item of source.items) {
      totalItems++;
      if (item.idCor) corFreq.set(item.idCor, (corFreq.get(item.idCor) ?? 0) + 1);
      if (item.idTipoVidro)
        vidroFreq.set(item.idTipoVidro, (vidroFreq.get(item.idTipoVidro) ?? 0) + 1);
      if (item.idTipoEnvidracamento)
        envFreq.set(
          item.idTipoEnvidracamento,
          (envFreq.get(item.idTipoEnvidracamento) ?? 0) + 1,
        );
      if (item.idAmbiente)
        ambFreq.set(item.idAmbiente, (ambFreq.get(item.idAmbiente) ?? 0) + 1);
    }
  }

  return {
    byCor: rankItems(corFreq, corMap, totalItems),
    byTipoVidro: rankItems(vidroFreq, vidroMap, totalItems),
    byTipoEnvidracamento: rankItems(envFreq, envMap, totalItems),
    byAmbiente: rankItems(ambFreq, ambMap, totalItems),
    totalItems,
    generatedAt: new Date().toISOString(),
  };
}

export function reviveProductsReportPayload(
  payload: ProductsReportPayload,
): ProductsReportPayload {
  return {
    lookups: payload.lookups,
    sources: payload.sources.map((s) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      scheduledDate: s.scheduledDate ? new Date(s.scheduledDate) : null,
    })),
  };
}
