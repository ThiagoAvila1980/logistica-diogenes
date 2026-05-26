import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, cuttingPlans, transportLogs, installationLogs } from "@/db/schema";
import {
  hasMeasurementItems,
  measurementClientName,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import type { KanbanOrderItem } from "./kanban";

const TRANSPORT_STATUSES = new Set([
  "transporte_perfil",
  "transporte_estrutural",
  "transporte_perfis_total",
  "transporte_acessorios",
  "transporte_levar_vidro",
]);

const INSTALLATION_STATUSES = new Set([
  "instalacao_estrutural",
  "instalacao_vidros",
  "concluido",
]);

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
      // Cutting steps
      corteFeito: cuttingPlans.corteFeito,
      embalagemFeita: cuttingPlans.embalagemFeita,
      acessoriosFeitos: cuttingPlans.acessoriosFeitos,
      // Transport steps
      levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
      levarPerfilTotal: transportLogs.levarPerfilTotal,
      levarAcessorios: transportLogs.levarAcessorios,
      levarVidro: transportLogs.levarVidro,
      // Installation steps
      instalacaoEstruturalFeita: installationLogs.instalacaoEstruturalFeita,
      instalacaoVidrosFeita: installationLogs.instalacaoVidrosFeita,
    })
    .from(measurements)
    .leftJoin(cuttingPlans, eq(cuttingPlans.idMedicao, measurements.id))
    .leftJoin(transportLogs, eq(transportLogs.idMedicao, measurements.id))
    .leftJoin(installationLogs, eq(installationLogs.idMedicao, measurements.id))
    .orderBy(desc(measurements.updatedAt));

  return rows.map((r) => {
    const isCortePhase =
      r.status === "cortes" ||
      r.status === "embalagem" ||
      r.status === "acessorios_plano";

    const isTransportPhase = TRANSPORT_STATUSES.has(r.status);
    const isInstallationPhase = INSTALLATION_STATUSES.has(r.status);

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
      transportSteps: isTransportPhase
        ? {
            levarPerfilEstrutural: r.levarPerfilEstrutural ?? false,
            levarPerfilTotal: r.levarPerfilTotal ?? false,
            levarAcessorios: r.levarAcessorios ?? false,
            levarVidro: r.levarVidro ?? false,
          }
        : null,
      installationSteps: isInstallationPhase
        ? {
            instalacaoEstruturalFeita: r.instalacaoEstruturalFeita ?? false,
            instalacaoVidrosFeita: r.instalacaoVidrosFeita ?? false,
          }
        : null,
    };
  });
}
