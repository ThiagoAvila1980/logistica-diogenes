"use client";

import { Droppable } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import { getAllowedTransitions } from "@/lib/workflow/measurement-flow";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import type { KanbanPhase } from "@/lib/kanban/column-groups";

type KanbanPhaseColumnProps = {
  phase: KanbanPhase;
  items: KanbanOrderItem[];
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
    <div className="flex h-full min-w-0 flex-col rounded-md border bg-muted/30 p-1.5">
      <div className="mb-1.5 rounded-sm bg-muted px-2 py-2">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-xs font-bold tracking-wide">
            {phase.title}
          </span>
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
            {items.length}
          </span>
        </div>
      </div>

      <Droppable droppableId={phase.id} isDropDisabled={isDropDisabled}>
        {(provided, snapshot) => (
          <ScrollArea className="h-[min(360px,calc(100dvh-11rem))] lg:h-[calc(100dvh-12rem)]">
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
              {items.map((os, idx) => {
                const canAdvance = getAllowedTransitions(
                  os.status,
                  os.measurementFlow,
                ).some((s) => s !== "revisao");

                return (
                  <KanbanCard
                    key={os.id}
                    os={os}
                    index={idx}
                    canAdvance={canAdvance}
                    onKeyboardAdvance={onKeyboardAdvance}
                  />
                );
              })}
              {provided.placeholder}
              {items.length === 0 && (
                <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground">
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
