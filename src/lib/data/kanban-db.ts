import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import {
  hasMeasurementItems,
  measurementClientName,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import {
  aggregateCuttingStepsFromItems,
  aggregateTransportStepsFromItems,
  aggregateInstallationStepsFromItems,
  hasPendingCuttingWorkOnItems,
  selectCuttingLineItems,
} from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
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
  // Fonte única de verdade: os agregados por etapa são derivados do JSONB
  // `items` (mantido pelo fluxo por-vão), com as MESMAS funções usadas nas
  // telas de detalhe — evitando a divergência com as colunas de log, que não
  // eram atualizadas pelo fluxo operacional.
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
      items: measurements.items,
    })
    .from(measurements)
    .orderBy(desc(measurements.updatedAt));

  return rows.map((r) => {
    const isCortePhase =
      r.status === "cortes" ||
      r.status === "embalagem" ||
      r.status === "acessorios_plano";

    const isTransportPhase = TRANSPORT_STATUSES.has(r.status);
    const isInstallationPhase = INSTALLATION_STATUSES.has(r.status);

    const items = (r.items as MeasurementLineItem[] | null) ?? [];

    // Espelha a regra da tela de produção: se há vãos marcados para corte,
    // o agregado considera apenas esses; senão, todos os vãos.
    const cuttingItems = selectCuttingLineItems(items);
    const cuttingAggregate = aggregateCuttingStepsFromItems(cuttingItems);

    const cuttingStepsData = {
      corte: cuttingAggregate.corteFeito,
      embalagem: cuttingAggregate.embalagemFeita,
      acessorios: cuttingAggregate.acessoriosFeitos,
      vidros: cuttingAggregate.vidrosFeitos,
    };

    const hasPendingCutting =
      isTransportPhase && hasPendingCuttingWorkOnItems(cuttingItems);

    const transportStepsData = aggregateTransportStepsFromItems(items);

    const hasFirstTransportDelivery =
      isTransportPhase && transportStepsData.levarPerfilEstrutural;

    const installationStepsData = aggregateInstallationStepsFromItems(items);

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
      cuttingSteps:
        isCortePhase || hasPendingCutting ? cuttingStepsData : null,
      transportSteps: isTransportPhase ? transportStepsData : null,
      installationSteps:
        isInstallationPhase || hasFirstTransportDelivery
          ? installationStepsData
          : null,
    };
  });
}
