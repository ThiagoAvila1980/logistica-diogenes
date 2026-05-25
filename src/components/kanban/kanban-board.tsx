"use client";

import { useCallback, useMemo, useState, useTransition, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanPhaseColumn } from "./kanban-phase-column";
import { KanbanColumn } from "./kanban-column";
import { KanbanFiltersBar } from "./kanban-filters";
import { KanbanColumnStats } from "./kanban-column-stats";
import { moveOSCard } from "@/actions/kanban-actions";
import { getAllowedTransitions } from "@/lib/workflow/status-machine";
import {
  KANBAN_PHASES,
  getPhaseIdForStatus,
  resolvePhaseDropTarget,
} from "@/lib/kanban/column-groups";
import type { OsStatus } from "@/db/schema";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import {
  DEFAULT_KANBAN_FILTERS,
  filterKanbanOrders,
  type KanbanFilters,
} from "@/lib/kanban/filter-orders";
import {
  KanbanMoveConfirmDialog,
  type KanbanPendingMove,
} from "./kanban-move-confirm-dialog";
import { KANBAN_VISIBLE_COLUMNS } from "@/lib/kanban/constants";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";

const REVISAO_PHASE_ID = "revisao";

type PhaseColumnsState = Record<string, KanbanOrderItem[]>;

function groupByPhase(data: KanbanOrderItem[]): PhaseColumnsState {
  const grouped: PhaseColumnsState = {
    [REVISAO_PHASE_ID]: [],
  };
  for (const phase of KANBAN_PHASES) {
    grouped[phase.id] = [];
  }

  for (const os of data) {
    const phaseId = getPhaseIdForStatus(os.status);
    if (phaseId && grouped[phaseId]) {
      grouped[phaseId].push(os);
    }
  }

  return grouped;
}

type KanbanBoardProps = {
  initialData: KanbanOrderItem[];
};

export function KanbanBoard({ initialData }: KanbanBoardProps) {
  const [filters, setFilters] = useState<KanbanFilters>(DEFAULT_KANBAN_FILTERS);
  const [columns, setColumns] = useState<PhaseColumnsState>(() =>
    groupByPhase(initialData),
  );
  const [isPending, startTransition] = useTransition();
  const [dragError, setDragError] = useState<string | null>(null);
  const [dragSuccess, setDragSuccess] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<KanbanPendingMove | null>(
    null,
  );

  const filteredData = useMemo(
    () => filterKanbanOrders(initialData, filters),
    [initialData, filters],
  );

  useEffect(() => {
    setColumns(groupByPhase(filteredData));
  }, [filteredData]);

  const findOrder = useCallback(
    (osId: string): KanbanOrderItem | undefined => {
      for (const list of Object.values(columns)) {
        const found = list.find((o) => o.id === osId);
        if (found) return found;
      }
      return initialData.find((o) => o.id === osId);
    },
    [columns, initialData],
  );

  const requestMove = useCallback(
    (
      osId: string,
      sourceStatus: OsStatus,
      destStatus: OsStatus,
      destPhaseId: string,
      destIndex?: number,
    ) => {
      setDragError(null);
      setDragSuccess(null);

      const order = findOrder(osId);
      if (!order) {
        setDragError("Ordem de serviço não encontrada.");
        return;
      }

      if (!getAllowedTransitions(sourceStatus).includes(destStatus)) {
        setDragError(
          `Não é possível mover de "${STATUS_LABELS[sourceStatus]}" para "${STATUS_LABELS[destStatus]}".`,
        );
        return;
      }

      setPendingMove({
        osId,
        osNumber: getOrderDisplayNumber(order),
        clientName: order.clientName,
        sourceStatus,
        destStatus,
        destPhaseId,
        destIndex,
      });
    },
    [findOrder],
  );

  const applyMove = useCallback(
    (
      osId: string,
      sourceStatus: OsStatus,
      destStatus: OsStatus,
      sourcePhaseId: string,
      destPhaseId: string,
      destIndex?: number,
    ) => {
      setDragError(null);
      setDragSuccess(null);

      const order = findOrder(osId);
      if (!order) {
        setDragError("Ordem de serviço não encontrada.");
        return;
      }

      if (!getAllowedTransitions(sourceStatus).includes(destStatus)) {
        setDragError(
          `Não é possível mover de "${STATUS_LABELS[sourceStatus]}" para "${STATUS_LABELS[destStatus]}".`,
        );
        return;
      }

      let prevColumns: PhaseColumnsState | null = null;

      setColumns((prev) => {
        prevColumns = structuredClone(prev);
        const next = structuredClone(prev);
        const srcList = next[sourcePhaseId] ?? [];
        const srcIdx = srcList.findIndex((o) => o.id === osId);
        if (srcIdx < 0) return prev;

        const [moved] = srcList.splice(srcIdx, 1);
        if (!moved) return prev;

        moved.status = destStatus;
        moved.updatedAt = new Date();
        next[destPhaseId] = next[destPhaseId] ?? [];
        const insertAt = destIndex ?? next[destPhaseId].length;
        next[destPhaseId].splice(insertAt, 0, moved);
        return next;
      });

      startTransition(async () => {
        const res = await moveOSCard(osId, destStatus);
        if (!res.success && prevColumns) {
          setColumns(prevColumns);
          setDragError(res.message ?? "Não foi possível mover a OS");
          return;
        }
        if (res.success && res.notificationSummary) {
          setDragSuccess(res.notificationSummary);
        }
      });
    },
    [findOrder],
  );

  const handleConfirmMove = useCallback(() => {
    if (!pendingMove) return;
    const {
      osId,
      sourceStatus,
      destStatus,
      destPhaseId,
      destIndex,
    } = pendingMove;
    const sourcePhaseId = getPhaseIdForStatus(sourceStatus);
    if (!sourcePhaseId || !destPhaseId) return;
    setPendingMove(null);
    applyMove(
      osId,
      sourceStatus,
      destStatus,
      sourcePhaseId,
      destPhaseId,
      destIndex,
    );
  }, [pendingMove, applyMove]);

  const handleCancelMove = useCallback(() => {
    if (isPending) return;
    setPendingMove(null);
  }, [isPending]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (
      !destination ||
      (destination.droppableId === source.droppableId &&
        destination.index === source.index)
    ) {
      return;
    }

    const sourcePhaseId = source.droppableId;
    const destPhaseId = destination.droppableId;
    const order = findOrder(draggableId);
    if (!order) return;

    const sourceStatus = order.status;

    if (sourcePhaseId === destPhaseId) {
      setColumns((prev) => {
        const next = structuredClone(prev);
        const list = next[sourcePhaseId];
        const [moved] = list.splice(source.index, 1);
        if (!moved) return prev;
        list.splice(destination.index, 0, moved);
        return next;
      });
      return;
    }

    const destStatus = resolvePhaseDropTarget(sourceStatus, destPhaseId);
    if (!destStatus) {
      setDragError(
        "Conclua a etapa atual antes de mover para a próxima coluna.",
      );
      return;
    }

    requestMove(
      draggableId,
      sourceStatus,
      destStatus,
      destPhaseId,
      destination.index,
    );
  };

  const handleKeyboardAdvance = useCallback(
    (osId: string) => {
      const order = findOrder(osId);
      if (!order) return;

      const sourceStatus = order.status;
      const next = getAllowedTransitions(sourceStatus).find(
        (s) => s !== "revisao",
      );

      if (!next) {
        setDragError("Não há próxima etapa permitida para esta OS.");
        return;
      }

      const sourcePhaseId = getPhaseIdForStatus(sourceStatus);
      const destPhaseId = getPhaseIdForStatus(next);
      if (!sourcePhaseId || !destPhaseId) return;

      requestMove(osId, sourceStatus, next, destPhaseId);
    },
    [findOrder, requestMove],
  );

  const revisaoItems = columns[REVISAO_PHASE_ID] ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <KanbanFiltersBar
        filters={filters}
        onChange={setFilters}
        totalCount={initialData.length}
        filteredCount={filteredData.length}
      />

      <KanbanColumnStats
        orders={filteredData}
        phaseIds={KANBAN_PHASES.map((p) => p.id)}
        page={0}
        visibleColumns={KANBAN_VISIBLE_COLUMNS}
      />

      <p className="hidden text-[10px] text-muted-foreground lg:block">
        Arraste pelo ⋮⋮ ·{" "}
        <kbd className="rounded border px-0.5 text-[9px]">Alt</kbd>+
        <kbd className="rounded border px-0.5 text-[9px]">→</kbd> avança etapa
      </p>

      {dragError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{dragError}</span>
            <button
              type="button"
              onClick={() => setDragError(null)}
              className="shrink-0 text-xs underline"
            >
              Fechar
            </button>
          </AlertDescription>
        </Alert>
      )}

      {dragSuccess && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>{dragSuccess}</span>
            <button
              type="button"
              onClick={() => setDragSuccess(null)}
              className="shrink-0 text-xs underline"
            >
              Fechar
            </button>
          </AlertDescription>
        </Alert>
      )}

      <KanbanMoveConfirmDialog
        pending={pendingMove}
        isSubmitting={isPending}
        onConfirm={handleConfirmMove}
        onCancel={handleCancelMove}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid min-h-0 flex-1 grid-cols-4 gap-1 pb-2 sm:gap-2">
          {KANBAN_PHASES.map((phase) => (
            <KanbanPhaseColumn
              key={phase.id}
              phase={phase}
              items={columns[phase.id] ?? []}
              isDropDisabled={isPending}
              onKeyboardAdvance={handleKeyboardAdvance}
            />
          ))}
        </div>

        {revisaoItems.length > 0 && (
          <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
            <KanbanColumn
              status="revisao"
              title="Revisão"
              titleTooltip={STATUS_LABELS.revisao}
              items={revisaoItems}
              isDropDisabled={isPending}
              canAdvanceCards={revisaoItems.some((item) =>
                getAllowedTransitions(item.status).some((s) => s !== "revisao"),
              )}
              onKeyboardAdvance={handleKeyboardAdvance}
            />
          </div>
        )}
      </DragDropContext>
    </div>
  );
}
