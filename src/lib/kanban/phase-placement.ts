import type { KanbanOrderItem } from "@/lib/data/kanban";
import {
  hasPendingCuttingSteps,
  isTransportFullyDone,
  isTransportPhaseStatus,
} from "@/lib/transport-gates";
import { KANBAN_PHASES, getPhaseIdForStatus } from "./column-groups";

const DRAGGABLE_SEP = "::";

export type KanbanPlacedOrder = {
  os: KanbanOrderItem;
  phaseId: string;
  placementKey: string;
  isParallelPlacement: boolean;
};

export function buildKanbanDraggableId(osId: string, phaseId: string): string {
  return `${osId}${DRAGGABLE_SEP}${phaseId}`;
}

export function parseKanbanDraggableId(draggableId: string): {
  osId: string;
  phaseId: string;
} {
  const idx = draggableId.lastIndexOf(DRAGGABLE_SEP);
  if (idx === -1) {
    return { osId: draggableId, phaseId: "" };
  }

  return {
    osId: draggableId.slice(0, idx),
    phaseId: draggableId.slice(idx + DRAGGABLE_SEP.length),
  };
}

function toCuttingStepsGate(os: KanbanOrderItem) {
  if (!os.cuttingSteps) return null;

  return {
    corteFeito: os.cuttingSteps.corte,
    embalagemFeita: os.cuttingSteps.embalagem,
    acessoriosFeitos: os.cuttingSteps.acessorios,
    vidrosFeitos: os.cuttingSteps.vidros,
  };
}

/** Fases em que a OS deve aparecer no kanban (suporta colunas paralelas). */
export function getKanbanPhaseIdsForOrder(os: KanbanOrderItem): string[] {
  const statusPhaseId = getPhaseIdForStatus(os.status);
  const phases = new Set<string>();

  if (statusPhaseId) {
    phases.add(statusPhaseId);
  }

  const cutting = toCuttingStepsGate(os);
  if (
    cutting &&
    hasPendingCuttingSteps(cutting) &&
    isTransportPhaseStatus(os.status)
  ) {
    phases.add("plano_corte");
  }

  const transport = os.transportSteps;
  if (
    transport &&
    isTransportFullyDone(transport) &&
    isTransportPhaseStatus(os.status)
  ) {
    phases.add("instalacao");
  }

  return [...phases];
}

export function isKanbanParallelPhase(
  os: KanbanOrderItem,
  phaseId: string,
): boolean {
  const statusPhaseId = getPhaseIdForStatus(os.status);
  return statusPhaseId !== null && phaseId !== statusPhaseId;
}

export function placeKanbanOrders(
  orders: KanbanOrderItem[],
): Record<string, KanbanPlacedOrder[]> {
  const grouped: Record<string, KanbanPlacedOrder[]> = {};
  for (const phase of KANBAN_PHASES) {
    grouped[phase.id] = [];
  }

  for (const os of orders) {
    for (const phaseId of getKanbanPhaseIdsForOrder(os)) {
      if (!grouped[phaseId]) continue;

      grouped[phaseId].push({
        os,
        phaseId,
        placementKey: buildKanbanDraggableId(os.id, phaseId),
        isParallelPlacement: isKanbanParallelPhase(os, phaseId),
      });
    }
  }

  return grouped;
}

export function orderAppearsInKanbanPhase(
  os: KanbanOrderItem,
  phaseId: string,
): boolean {
  return getKanbanPhaseIdsForOrder(os).includes(phaseId);
}
