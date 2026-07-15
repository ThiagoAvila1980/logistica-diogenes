"use client";

import { Droppable } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import { getAllowedTransitions } from "@/lib/workflow/status-machine";
import { getRevertablePhase } from "@/lib/workflow/stage-revert";
import type { KanbanPhase } from "@/lib/kanban/column-groups";

import type { KanbanPlacedOrder } from "@/lib/kanban/phase-placement";

type KanbanPhaseColumnProps = {
  phase: KanbanPhase;
  items: KanbanPlacedOrder[];
  isDropDisabled?: boolean;
  onKeyboardAdvance?: (osId: string) => void;
  canRevertStage?: boolean;
  onRequestRevert?: (osId: string) => void;
  /** Coluna em tela cheia no carrossel mobile */
  variant?: "default" | "carousel";
};

export function KanbanPhaseColumn({
  phase,
  items,
  isDropDisabled,
  onKeyboardAdvance,
  canRevertStage,
  onRequestRevert,
  variant = "default",
}: KanbanPhaseColumnProps) {
  const isCarousel = variant === "carousel";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-md border bg-muted/30",
        isCarousel
          ? "w-full min-w-0 p-2"
          : "w-auto min-w-0 shrink p-1.5 md:p-2",
      )}
    >
      <div
        className={cn(
          "mb-1.5 rounded-sm px-2 py-2",
          phase.readOnly
            ? "bg-emerald-700/20 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
            : "bg-primary/20 text-primary",
          isCarousel && "mb-2",
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <span
            className="truncate text-xs font-bold leading-tight tracking-wide"
            title={phase.title}
          >
            {phase.title}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1 py-px text-[10px] font-semibold tabular-nums text-primary-foreground sm:px-2 sm:py-0.5 sm:text-[11px]",
              phase.readOnly
                ? "bg-emerald-700/60 dark:bg-emerald-500/60"
                : "bg-primary/50",
            )}
          >
            {items.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={phase.id} isDropDisabled={isDropDisabled || !!phase.readOnly}>
        {(provided, snapshot) => (
          <ScrollArea
            className={cn(
              isCarousel
                ? "h-[calc((100dvh-16.5rem)*0.9)]"
                : "h-[min(360px,calc(100dvh-12rem))] lg:h-[calc(100dvh-12rem)]",
            )}
          >
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "min-h-[120px] rounded-md px-0.5 pb-1 transition-colors",
                snapshot.isDraggingOver
                  ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
                  : "bg-transparent",
              )}
            >
              {items.map((item, idx) => {
                const canAdvance =
                  !item.isParallelPlacement &&
                  getAllowedTransitions(item.os.status).length > 0;

                return (
                  <KanbanCard
                    key={item.placementKey}
                    os={item.os}
                    phaseId={item.phaseId}
                    placementKey={item.placementKey}
                    isParallelPlacement={item.isParallelPlacement}
                    index={idx}
                    canAdvance={canAdvance}
                    onKeyboardAdvance={onKeyboardAdvance}
                    canRevert={
                      canRevertStage &&
                      !item.isParallelPlacement &&
                      getRevertablePhase(item.os.status) !== null
                    }
                    onRequestRevert={onRequestRevert}
                    variant={variant}
                  />
                );
              })}
              {provided.placeholder}
              {items.length === 0 && (
                <div className="flex h-16 items-center justify-center rounded-md border border-dashed text-[11px] text-muted-foreground sm:h-24">
                  Nenhuma OS
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
