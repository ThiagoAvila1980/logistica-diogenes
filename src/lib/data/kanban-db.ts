import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceOrders, measurements } from "@/db/schema";
import {
  measurementClientName,
  primaryMeasurementJoin,
} from "@/lib/data/order-measurement-join";
import type { KanbanOrderItem } from "./kanban";

export async function listKanbanOrdersDb(): Promise<KanbanOrderItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: serviceOrders.id,
      number: serviceOrders.number,
      budgetReference: serviceOrders.budgetReference,
      status: serviceOrders.status,
      measurementFlow: serviceOrders.measurementFlow,
      clientName: measurementClientName,
      priority: serviceOrders.priority,
      scheduledDate: serviceOrders.scheduledDate,
      updatedAt: serviceOrders.updatedAt,
    })
    .from(serviceOrders)
    .leftJoin(measurements, primaryMeasurementJoin)
    .orderBy(desc(serviceOrders.updatedAt));

  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    budgetReference: r.budgetReference,
    status: r.status,
    measurementFlow: r.measurementFlow,
    clientName: r.clientName,
    priority: r.priority,
    scheduledDate: r.scheduledDate,
    updatedAt: r.updatedAt,
  }));
}
