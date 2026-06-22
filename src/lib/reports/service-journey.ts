import type { OsStatus } from "@/db/schema";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import { getOrderDisplayNumber } from "@/lib/order-display";
import {
  KANBAN_PHASES,
  getPhaseIdForStatus,
  type KanbanPhase,
} from "@/lib/kanban/column-groups";
import { getKanbanPhaseIdsForOrder } from "@/lib/kanban/phase-placement";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";

export type ServicePhaseState = "completed" | "current" | "pending";

/** Rótulos legíveis no relatório (nomes completos das fases). */
export const REPORT_PHASE_LABELS: Record<string, string> = {
  medicao: "Medição",
  plano_corte: "Corte",
  transporte: "Transporte",
  instalacao: "Instalação",
  concluidos: "Concluídos",
};

export type ServicePhaseJourney = {
  phaseId: string;
  title: string;
  shortTitle: string;
  state: ServicePhaseState;
  enteredAt: Date | null;
};

export type StatusHistoryEntry = {
  fromStatus: OsStatus;
  toStatus: OsStatus;
  createdAt: Date;
};

export type ServiceJourneyRow = {
  id: string;
  number: string;
  displayNumber: string;
  clientName: string;
  budgetReference: string | null;
  priority: KanbanOrderItem["priority"];
  scheduledDate: Date | null;
  currentStatus: OsStatus;
  currentStatusLabel: string;
  currentPhaseId: string;
  currentPhaseTitle: string;
  /** Fases ativas no kanban (inclui colunas paralelas). */
  activePhaseIds: string[];
  phases: ServicePhaseJourney[];
};

function phaseIndex(phaseId: string): number {
  return KANBAN_PHASES.findIndex((phase) => phase.id === phaseId);
}

function collectHistoryPhaseIds(history: StatusHistoryEntry[]): Set<string> {
  const touched = new Set<string>();
  for (const entry of history) {
    const fromPhase = getPhaseIdForStatus(entry.fromStatus);
    const toPhase = getPhaseIdForStatus(entry.toStatus);
    if (fromPhase) touched.add(fromPhase);
    if (toPhase) touched.add(toPhase);
  }
  return touched;
}

function buildPhaseEnteredAt(
  history: StatusHistoryEntry[],
): Map<string, Date> {
  const enteredAt = new Map<string, Date>();
  const sorted = [...history].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  for (const entry of sorted) {
    const phaseId = getPhaseIdForStatus(entry.toStatus);
    if (phaseId && !enteredAt.has(phaseId)) {
      enteredAt.set(phaseId, entry.createdAt);
    }
  }

  return enteredAt;
}

function resolvePhaseState(
  phase: KanbanPhase,
  statusPhaseId: string,
  activePhaseIds: Set<string>,
  historyPhaseIds: Set<string>,
): ServicePhaseState {
  if (phase.id === statusPhaseId) return "current";
  if (activePhaseIds.has(phase.id)) return "current";

  const idx = phaseIndex(phase.id);
  const statusIdx = phaseIndex(statusPhaseId);
  if (idx >= 0 && statusIdx >= 0 && idx < statusIdx) return "completed";
  if (historyPhaseIds.has(phase.id)) return "completed";

  return "pending";
}

export function buildServiceJourneyRow(
  order: KanbanOrderItem,
  history: StatusHistoryEntry[] = [],
): ServiceJourneyRow {
  const statusPhaseId = getPhaseIdForStatus(order.status) ?? "medicao";
  const currentPhase =
    KANBAN_PHASES.find((phase) => phase.id === statusPhaseId) ??
    KANBAN_PHASES[0];
  const activePhaseIds = getKanbanPhaseIdsForOrder(order);
  const activePhaseIdSet = new Set(activePhaseIds);
  const historyPhaseIds = collectHistoryPhaseIds(history);
  const enteredAtByPhase = buildPhaseEnteredAt(history);

  const phases = KANBAN_PHASES.map((phase) => ({
    phaseId: phase.id,
    title: phase.title,
    shortTitle: REPORT_PHASE_LABELS[phase.id] ?? phase.shortTitle,
    state: resolvePhaseState(
      phase,
      statusPhaseId,
      activePhaseIdSet,
      historyPhaseIds,
    ),
    enteredAt: enteredAtByPhase.get(phase.id) ?? null,
  }));

  return {
    id: order.id,
    number: order.number,
    displayNumber: getOrderDisplayNumber(order),
    clientName: order.clientName,
    budgetReference: order.budgetReference,
    priority: order.priority,
    scheduledDate: order.scheduledDate,
    currentStatus: order.status,
    currentStatusLabel: STATUS_LABELS[order.status],
    currentPhaseId: statusPhaseId,
    currentPhaseTitle: REPORT_PHASE_LABELS[statusPhaseId] ?? currentPhase.title,
    activePhaseIds,
    phases,
  };
}

/** Serviço aparece no filtro de etapa quando está ativo na coluna correspondente. */
export function matchesServiceReportStage(
  row: ServiceJourneyRow,
  stage: string,
): boolean {
  if (stage === "all") return true;
  return row.activePhaseIds.includes(stage);
}

export function buildServiceJourneyRows(
  orders: KanbanOrderItem[],
  historyByOrderId: Map<string, StatusHistoryEntry[]>,
): ServiceJourneyRow[] {
  return orders.map((order) =>
    buildServiceJourneyRow(order, historyByOrderId.get(order.id) ?? []),
  );
}
