"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSlowPending } from "@/hooks/use-slow-pending";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { KanbanPhaseColumn } from "./kanban-phase-column";
import { KanbanFiltersBar } from "./kanban-filters";
import { KanbanColumnStats } from "./kanban-column-stats";
import { moveOSCard, refreshKanbanOrders } from "@/actions/kanban-actions";
import { getAllowedTransitions } from "@/lib/workflow/status-machine";
import {
  KANBAN_PHASES,
  getPhaseIdForStatus,
  resolvePhaseDropTarget,
} from "@/lib/kanban/column-groups";
import {
  parseKanbanDraggableId,
  placeKanbanOrders,
  type KanbanPlacedOrder,
} from "@/lib/kanban/phase-placement";
import type { OsStatus } from "@/db/schema";
import {
  reviveKanbanOrders,
  type KanbanOrderItem,
} from "@/lib/data/kanban-types";
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
import { Button } from "@/components/ui/button";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import { cn } from "@/lib/utils";

type PhaseColumnsState = Record<string, KanbanPlacedOrder[]>;

function groupByPhase(data: KanbanOrderItem[]): PhaseColumnsState {
  return placeKanbanOrders(data);
}

type KanbanBoardProps = {
  initialData: KanbanOrderItem[];
};

export function KanbanBoard({ initialData }: KanbanBoardProps) {
  const [orders, setOrders] = useState(initialData);
  const [filters, setFilters] = useState<KanbanFilters>(DEFAULT_KANBAN_FILTERS);
  const [columns, setColumns] = useState<PhaseColumnsState>(() =>
    groupByPhase(initialData),
  );
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, startRefresh] = useTransition();
  const isMoveSlowPending = useSlowPending(isPending);
  // Serializa moves: aguarda o anterior terminar antes de enviar o próximo
  const pendingMoveRef = useRef<Promise<void>>(Promise.resolve());
  const [dragError, setDragError] = useState<string | null>(null);
  const [dragSuccess, setDragSuccess] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<KanbanPendingMove | null>(
    null,
  );

  useEffect(() => {
    setOrders(initialData);
  }, [initialData]);

  const filteredData = useMemo(
    () => filterKanbanOrders(orders, filters),
    [orders, filters],
  );

  useEffect(() => {
    setColumns(groupByPhase(filteredData));
  }, [filteredData]);

  const findOrder = useCallback(
    (osId: string): KanbanOrderItem | undefined => {
      for (const list of Object.values(columns)) {
        const found = list.find((item) => item.os.id === osId);
        if (found) return found.os;
      }
      return orders.find((o) => o.id === osId);
    },
    [columns, orders],
  );

  const handleRefresh = useCallback(() => {
    setDragError(null);
    setDragSuccess(null);

    startRefresh(async () => {
      const result = await refreshKanbanOrders();
      if (!result.success) {
        setDragError(result.message);
        return;
      }

      const nextOrders = reviveKanbanOrders(result.orders);
      setOrders(nextOrders);
      setDragSuccess("Kanban atualizado.");
    });
  }, []);

  const requestMove = useCallback(
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

      setPendingMove({
        osId,
        osNumber: getOrderDisplayNumber(order),
        clientName: order.clientName,
        sourceStatus,
        destStatus,
        sourcePhaseId,
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
        const srcIdx = srcList.findIndex((item) => item.os.id === osId);
        if (srcIdx < 0) return prev;

        const [moved] = srcList.splice(srcIdx, 1);
        if (!moved) return prev;

        moved.os.status = destStatus;
        moved.os.updatedAt = new Date();
        next[destPhaseId] = next[destPhaseId] ?? [];
        const insertAt = destIndex ?? next[destPhaseId].length;
        next[destPhaseId].splice(insertAt, 0, moved);
        return next;
      });

      // Enfileira o move para evitar race condition entre drags simultâneos
      pendingMoveRef.current = pendingMoveRef.current.then(() =>
        new Promise<void>((resolve) => {
          startTransition(async () => {
            try {
              const res = await moveOSCard(osId, destStatus);
              if (!res.success && prevColumns) {
                setColumns(prevColumns);
                setDragError(res.message ?? "Não foi possível mover a OS");
                return;
              }
              if (res.success && res.notificationSummary) {
                setDragSuccess(res.notificationSummary);
              }
              if (res.success) {
                setOrders((prev) =>
                  prev.map((o) =>
                    o.id === osId
                      ? { ...o, status: destStatus, updatedAt: new Date() }
                      : o,
                  ),
                );
              }
            } finally {
              resolve();
            }
          });
        }),
      );
    },
    [findOrder],
  );

  const handleConfirmMove = useCallback(() => {
    if (!pendingMove) return;
    const {
      osId,
      sourceStatus,
      destStatus,
      sourcePhaseId,
      destPhaseId,
      destIndex,
    } = pendingMove;
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
    const { osId } = parseKanbanDraggableId(draggableId);
    const order = findOrder(osId);
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
      osId,
      sourceStatus,
      destStatus,
      sourcePhaseId,
      destPhaseId,
      destination.index,
    );
  };

  const handleKeyboardAdvance = useCallback(
    (osId: string) => {
      const order = findOrder(osId);
      if (!order) return;

      const sourceStatus = order.status;
      const next = getAllowedTransitions(sourceStatus)[0];

      if (!next) {
        setDragError("Não há próxima etapa permitida para esta OS.");
        return;
      }

      const sourcePhaseId = getPhaseIdForStatus(sourceStatus);
      const destPhaseId = getPhaseIdForStatus(next);
      if (!sourcePhaseId || !destPhaseId) return;

      requestMove(osId, sourceStatus, next, sourcePhaseId, destPhaseId);
    },
    [findOrder, requestMove],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight lg:text-xl">
            Kanban — Ordens de Serviço
          </h1>
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {orders.length} OS
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={handleRefresh}
          disabled={isRefreshing || isPending}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
            aria-hidden
          />
          Atualizar
        </Button>
      </div>

      <KanbanFiltersBar
        filters={filters}
        onChange={setFilters}
        totalCount={orders.length}
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

      {isMoveSlowPending && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="text-muted-foreground">
            Aguardando resposta do servidor...
          </AlertDescription>
        </Alert>
      )}

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
      </DragDropContext>
    </div>
  );
}
