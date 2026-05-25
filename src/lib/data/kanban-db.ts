import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, cuttingPlans } from "@/db/schema";
import {
  hasMeasurementItems,
  measurementClientName,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import type { KanbanOrderItem } from "./kanban";

export async function listKanbanOrdersDb(): Promise<KanbanOrderItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: measurements.id,
      number: measurements.number,
      budgetReference: resolvedBudgetReference,
      status: measurements.etapa,
      type: measurements.type,
      measurementStatus: measurements.status,
      clientName: measurementClientName,
      priority: measurements.priority,
      scheduledDate: measurements.scheduledDate,
      updatedAt: measurements.updatedAt,
      hasMeasurement: hasMeasurementItems,
      corteFeito: cuttingPlans.corteFeito,
      embalagemFeita: cuttingPlans.embalagemFeita,
      acessoriosFeitos: cuttingPlans.acessoriosFeitos,
    })
    .from(measurements)
    .leftJoin(cuttingPlans, eq(cuttingPlans.idMedicao, measurements.id))
    .orderBy(desc(measurements.updatedAt));

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
      type: r.type,
      measurementStatus: r.measurementStatus,
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
