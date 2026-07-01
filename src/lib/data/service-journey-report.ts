import "server-only";

import { asc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { statusHistory } from "@/db/schema";
import { listKanbanOrders } from "@/lib/data/kanban";
import {
  buildServiceJourneyRows,
  type ServiceJourneyRow,
  type StatusHistoryEntry,
} from "@/lib/reports/service-journey";

async function listStatusHistoryByOrderIdsDb(
  orderIds: string[],
): Promise<Map<string, StatusHistoryEntry[]>> {
  const map = new Map<string, StatusHistoryEntry[]>();
  if (orderIds.length === 0) return map;

  const db = getDb();
  const rows = await db
    .select({
      measurementId: statusHistory.measurementId,
      fromStatus: statusHistory.fromStatus,
      toStatus: statusHistory.toStatus,
      createdAt: statusHistory.createdAt,
    })
    .from(statusHistory)
    .where(inArray(statusHistory.measurementId, orderIds))
    .orderBy(asc(statusHistory.createdAt));

  for (const row of rows) {
    const list = map.get(row.measurementId) ?? [];
    list.push({
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
      createdAt: row.createdAt,
    });
    map.set(row.measurementId, list);
  }

  return map;
}

/** Relatório de jornada dos serviços — visão admin (todas as OS). */
export async function listServiceJourneyReportRows(): Promise<ServiceJourneyRow[]> {
  const orders = await listKanbanOrders();
  const historyByOrderId = await listStatusHistoryByOrderIdsDb(
    orders.map((order) => order.id),
  );
  return buildServiceJourneyRows(orders, historyByOrderId);
}
