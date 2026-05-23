import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceOrders, measurements, cuttingPlans } from "@/db/schema";
import {
  hasMeasurementItems,
  measurementClientName,
  primaryMeasurementJoin,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import type { KanbanOrderItem } from "./kanban";

export async function listKanbanOrdersDb(): Promise<KanbanOrderItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: serviceOrders.id,
      number: serviceOrders.number,
      budgetReference: resolvedBudgetReference,
      status: serviceOrders.status,
      measurementFlow: serviceOrders.measurementFlow,
      clientName: measurementClientName,
      priority: serviceOrders.priority,
      scheduledDate: serviceOrders.scheduledDate,
      updatedAt: serviceOrders.updatedAt,
      hasMeasurement: hasMeasurementItems,
      corteFeito: cuttingPlans.corteFeito,
      embalagemFeita: cuttingPlans.embalagemFeita,
      acessoriosFeitos: cuttingPlans.acessoriosFeitos,
    })
    .from(serviceOrders)
    .leftJoin(measurements, primaryMeasurementJoin)
    .leftJoin(cuttingPlans, eq(cuttingPlans.osId, serviceOrders.id))
    .orderBy(desc(serviceOrders.updatedAt));

  return rows.map((r) => {
    const isCortePhase =
      r.status === "cortes" ||
      r.status === "embalagem" ||
      r.status === "acessorios_plano";

    return {
      id: r.id,
      number: r.number,
      budgetReference: r.budgetReference,
      status: r.status,
      measurementFlow: r.measurementFlow,
      clientName: r.clientName,
      priority: r.priority,
      scheduledDate: r.scheduledDate,
      updatedAt: r.updatedAt,
      hasMeasurement: Boolean(r.hasMeasurement),
      cuttingSteps: isCortePhase
        ? {
            corte: r.corteFeito ?? false,
            embalagem: r.embalagemFeita ?? false,
            acessorios: r.acessoriosFeitos ?? false,
          }
        : null,
    };
  });
}
