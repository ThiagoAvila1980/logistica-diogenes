import type { KanbanOrderItem } from "@/lib/data/kanban";
import {
  KANBAN_PHASES,
  getPhaseIdForStatus,
} from "@/lib/kanban/column-groups";
import { getKanbanPhaseIdsForOrder } from "@/lib/kanban/phase-placement";
import { REPORT_PHASE_LABELS } from "@/lib/reports/service-journey";

export type PhaseCount = {
  phaseId: string;
  phaseTitle: string;
  count: number;
};

/** Rótulo legível da fase para relatórios (alinhado à jornada de serviços). */
export function getReportPhaseLabel(phaseId: string, shortTitle?: string): string {
  return REPORT_PHASE_LABELS[phaseId] ?? shortTitle ?? phaseId;
}

/**
 * Conta OS por fase usando a mesma regra do Kanban / jornada de serviços
 * (`getKanbanPhaseIdsForOrder`). Uma OS pode incrementar mais de uma fase
 * quando há colunas paralelas (ex.: transporte + instalação).
 */
export function countOrdersByKanbanPhase(
  orders: KanbanOrderItem[],
): PhaseCount[] {
  const phaseCount = new Map<string, number>(
    KANBAN_PHASES.map((p) => [p.id, 0]),
  );

  for (const order of orders) {
    for (const phaseId of getKanbanPhaseIdsForOrder(order)) {
      phaseCount.set(phaseId, (phaseCount.get(phaseId) ?? 0) + 1);
    }
  }

  return KANBAN_PHASES.map((p) => ({
    phaseId: p.id,
    phaseTitle: getReportPhaseLabel(p.id, p.shortTitle),
    count: phaseCount.get(p.id) ?? 0,
  }));
}

/**
 * Fase principal da OS para exibição em tabelas — a mais avançada entre
 * as fases ativas no Kanban (mesma fonte de verdade da jornada).
 */
export function getPrimaryKanbanPhaseId(order: KanbanOrderItem): string {
  const activeIds = getKanbanPhaseIdsForOrder(order);
  if (activeIds.length === 0) {
    return getPhaseIdForStatus(order.status) ?? "medicao";
  }
  if (activeIds.length === 1) return activeIds[0]!;

  let bestIdx = -1;
  let bestId = activeIds[0]!;
  for (const id of activeIds) {
    const idx = KANBAN_PHASES.findIndex((p) => p.id === id);
    if (idx > bestIdx) {
      bestIdx = idx;
      bestId = id;
    }
  }
  return bestId;
}

export function getPrimaryKanbanPhase(order: KanbanOrderItem): {
  id: string;
  title: string;
} {
  const phase = KANBAN_PHASES.find((p) => p.id === getPrimaryKanbanPhaseId(order));
  const id = phase?.id ?? "medicao";
  return {
    id,
    title: getReportPhaseLabel(id, phase?.shortTitle),
  };
}
