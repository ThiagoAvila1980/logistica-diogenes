"use client";

import { Droppable } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import { getAllowedTransitions } from "@/lib/workflow/status-machine";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import type { KanbanPhase } from "@/lib/kanban/column-groups";

import type { KanbanPlacedOrder } from "@/lib/kanban/phase-placement";

type KanbanPhaseColumnProps = {
  phase: KanbanPhase;
  items: KanbanPlacedOrder[];
  isDropDisabled?: boolean;
  onKeyboardAdvance?: (osId: string) => void;
};

export function KanbanPhaseColumn({
  phase,
  items,
  isDropDisabled,
  onKeyboardAdvance,
}: KanbanPhaseColumnProps) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-md border bg-muted/30 p-1 sm:p-1.5">
      <div className="mb-1 rounded-sm bg-primary/20 text-primary px-1 py-1.5 sm:mb-1.5 sm:px-2 sm:py-2">
        <div className="flex items-center justify-between gap-0.5 sm:gap-1">
          <span
            className="truncate text-[10px] font-bold leading-tight tracking-wide sm:text-xs"
            title={phase.title}
          >
            <span className="sm:hidden">{phase.shortTitle}</span>
            <span className="hidden sm:inline">{phase.title}</span>
          </span>
          <span className="shrink-0 rounded-full bg-primary/50 px-1 py-px text-[10px] font-semibold tabular-nums text-primary-foreground sm:px-2 sm:py-0.5 sm:text-[11px]">
            {items.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={phase.id} isDropDisabled={isDropDisabled}>
        {(provided, snapshot) => (
          <ScrollArea className="h-[min(320px,calc(100dvh-13rem))] sm:h-[min(360px,calc(100dvh-12rem))] lg:h-[calc(100dvh-12rem)]">
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
                  />
                );
              })}
              {provided.placeholder}
              {items.length === 0 && (
                <div className="flex h-16 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground sm:h-24 sm:text-[11px]">
                  <span className="hidden sm:inline">Nenhuma OS</span>
                  <span className="sm:hidden">—</span>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
