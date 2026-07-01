import "server-only";

import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { measurementClientName, resolvedBudgetReference } from "@/lib/data/order-measurement-join";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  computeProductsReport,
  type ProductsReportPayload,
} from "@/lib/reports/products-compute";

export type RankedItem = {
  id: string;
  label: string;
  count: number;
  pct: number;
};

export type ProductsReportData = {
  byCor: RankedItem[];
  byTipoVidro: RankedItem[];
  byTipoEnvidracamento: RankedItem[];
  byAmbiente: RankedItem[];
  totalItems: number;
  generatedAt: string;
};

export type { ProductsReportPayload } from "@/lib/reports/products-compute";

async function getProductsReportPayloadDb(): Promise<ProductsReportPayload> {
  const db = getDb();

  const [rows, lookups] = await Promise.all([
    db
      .select({
        id: measurements.id,
        number: measurements.number,
        budgetReference: resolvedBudgetReference,
        clientName: measurementClientName,
        createdAt: measurements.createdAt,
        scheduledDate: measurements.scheduledDate,
        items: measurements.items,
      })
      .from(measurements),
    listMeasurementLookups(),
  ]);

  return {
    lookups,
    sources: rows.map((row) => ({
      id: row.id,
      clientName: row.clientName,
      number: row.number,
      budgetReference: row.budgetReference,
      createdAt: row.createdAt,
      scheduledDate: row.scheduledDate,
      items: (row.items as MeasurementLineItem[] | null) ?? [],
    })),
  };
}

export async function getProductsReportPayload(): Promise<ProductsReportPayload> {
  return getProductsReportPayloadDb();
}

export async function getProductsReport(): Promise<ProductsReportData> {
  const payload = await getProductsReportPayload();
  return computeProductsReport(payload);
}
