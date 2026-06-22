import "server-only";

import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import { useMockData } from "@/lib/data/config";
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

function getMockProductsPayload(): ProductsReportPayload {
  return {
    lookups: {
      cores: [
        { id: "c1", descricao: "Branco" },
        { id: "c2", descricao: "Bronze" },
      ],
      tipoVidro: [{ id: "v1", descricao: "Temperado 8mm" }],
      tipoEnvidracamento: [{ id: "e1", descricao: "Esquadria deslizante" }],
      ambientes: [{ id: "a1", descricao: "Varanda" }],
    },
    sources: [
      {
        id: "1",
        clientName: "Cliente A",
        number: "001",
        budgetReference: "001/2026",
        createdAt: new Date(),
        scheduledDate: null,
        items: [
          {
            id: "i1",
            qty: 1,
            largura: 100,
            altura: 200,
            idCor: "c1",
            idTipoVidro: "v1",
            idTipoEnvidracamento: "e1",
            idAmbiente: "a1",
          },
        ],
      },
    ],
  };
}

export async function getProductsReportPayload(): Promise<ProductsReportPayload> {
  if (useMockData()) return getMockProductsPayload();
  return getProductsReportPayloadDb();
}

export async function getProductsReport(): Promise<ProductsReportData> {
  const payload = await getProductsReportPayload();
  return computeProductsReport(payload);
}
