import type { KanbanOrderItem } from "@/lib/data/kanban";
import { KANBAN_PHASES } from "@/lib/kanban/column-groups";
import { orderAppearsInKanbanPhase } from "@/lib/kanban/phase-placement";

export type ColumnMetric = {
  phaseId: string;
  label: string;
  count: number;
  avgHours: number;
};

export function computePhaseMetrics(
  orders: KanbanOrderItem[],
  phaseIds: string[],
): ColumnMetric[] {
  const now = Date.now();
  const phaseById = new Map(KANBAN_PHASES.map((p) => [p.id, p]));

  return phaseIds.map((phaseId) => {
    const phase = phaseById.get(phaseId);
    const inPhase = orders.filter((o) =>
      orderAppearsInKanbanPhase(o, phaseId),
    );

    if (inPhase.length === 0) {
      return {
        phaseId,
        label: phase?.title ?? phaseId,
        count: 0,
        avgHours: 0,
      };
    }

    const totalMs = inPhase.reduce((sum, o) => {
      const entered = new Date(o.updatedAt).getTime();
      return sum + Math.max(0, now - entered);
    }, 0);

    const avgHours = totalMs / inPhase.length / (1000 * 60 * 60);

    return {
      phaseId,
      label: phase?.title ?? phaseId,
      count: inPhase.length,
      avgHours: Math.round(avgHours * 10) / 10,
    };
  });
}

/** @deprecated Use computePhaseMetrics */
export type LegacyColumnMetric = {
  status: import("@/db/schema").OsStatus;
  count: number;
  avgHours: number;
};

/** @deprecated Use computePhaseMetrics */
export function computeColumnMetrics(
  orders: KanbanOrderItem[],
  columnIds: import("@/db/schema").OsStatus[],
): LegacyColumnMetric[] {
  const now = Date.now();

  return columnIds.map((status) => {
    const inColumn = orders.filter((o) => o.status === status);
    if (inColumn.length === 0) {
      return { status, count: 0, avgHours: 0 };
    }

    const totalMs = inColumn.reduce((sum, o) => {
      const entered = new Date(o.updatedAt).getTime();
      return sum + Math.max(0, now - entered);
    }, 0);

    const avgHours = totalMs / inColumn.length / (1000 * 60 * 60);

    return {
      status,
      count: inColumn.length,
      avgHours: Math.round(avgHours * 10) / 10,
    };
  });
}

export function formatAvgDuration(hours: number): string {
  if (hours <= 0) return "—";
  if (hours < 24) return `${hours}h`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days}d`;
}
