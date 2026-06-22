import "server-only";

import { gte } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, statusHistory } from "@/db/schema";
import { useMockData } from "@/lib/data/config";
import { listKanbanOrders } from "@/lib/data/kanban";
import {
  computeKpiSummary,
  type KpiReportPayload,
  type KpiStatusHistoryEntry,
  type KpiSummary,
} from "@/lib/reports/kpis-compute";

export type { KpiReportPayload, KpiSummary } from "@/lib/reports/kpis-compute";

async function getKpiReportPayloadDb(): Promise<KpiReportPayload> {
  const db = getDb();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [metaRows, historyRows, kanbanOrders] = await Promise.all([
    db
      .select({
        id: measurements.id,
        createdAt: measurements.createdAt,
        updatedAt: measurements.updatedAt,
      })
      .from(measurements),
    db
      .select({
        measurementId: statusHistory.measurementId,
        fromStatus: statusHistory.fromStatus,
        toStatus: statusHistory.toStatus,
        createdAt: statusHistory.createdAt,
      })
      .from(statusHistory)
      .where(gte(statusHistory.createdAt, sixMonthsAgo)),
    listKanbanOrders(),
  ]);

  const history: KpiStatusHistoryEntry[] = historyRows.map((h) => ({
    measurementId: h.measurementId,
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    createdAt: h.createdAt,
  }));

  return {
    orders: kanbanOrders,
    orderMeta: metaRows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    history,
  };
}

export async function getKpiReportPayload(): Promise<KpiReportPayload> {
  if (useMockData()) {
    const orders = await listKanbanOrders();
    const now = new Date();
    return {
      orders,
      orderMeta: orders.map((o, i) => ({
        id: o.id,
        createdAt: new Date(now.getTime() - (i + 1) * 86_400_000 * 3),
        updatedAt: o.updatedAt,
      })),
      history: [],
    };
  }
  return getKpiReportPayloadDb();
}

export async function getKpiSummary(): Promise<KpiSummary> {
  const payload = await getKpiReportPayload();
  return computeKpiSummary(payload);
}
