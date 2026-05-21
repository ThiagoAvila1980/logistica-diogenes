"use client";

import { Droppable } from "@hello-pangea/dnd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import type { OsStatus } from "@/db/schema";

type KanbanColumnProps = {
  status: OsStatus;
  title: string;
  titleTooltip?: string;
  items: KanbanOrderItem[];
  isDropDisabled?: boolean;
  avgDurationLabel?: string;
  canAdvanceCards?: boolean;
  onKeyboardAdvance?: (osId: string) => void;
};

export function KanbanColumn({
  status,
  title,
  titleTooltip,
  items,
  isDropDisabled,
  avgDurationLabel,
  canAdvanceCards,
  onKeyboardAdvance,
}: KanbanColumnProps) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-md bg-muted/40 p-1.5">
      <div
        className="rounded-sm bg-muted px-1 py-1.5"
        title={
          titleTooltip
            ? `${titleTooltip}${avgDurationLabel ? ` · média ${avgDurationLabel}` : ""}`
            : avgDurationLabel
              ? `Média na coluna: ${avgDurationLabel}`
              : undefined
        }
      >
        <div className="flex items-center justify-between gap-0.5">
          <span className="truncate text-xs font-semibold leading-tight">
            {title}
          </span>
          <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
            {items.length}
          </span>
        </div>
        {avgDurationLabel && (
          <span className="mt-0.5 block truncate text-[9px] text-muted-foreground lg:hidden">
            {avgDurationLabel}
          </span>
        )}
      </div>

      <Droppable droppableId={status} isDropDisabled={isDropDisabled}>
        {(provided, snapshot) => (
          <ScrollArea className="h-[min(360px,calc(100dvh-11rem))] lg:h-[calc(100dvh-12rem)]">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "min-h-[80px] rounded px-0.5 pb-1 transition-colors",
                snapshot.isDraggingOver
                  ? "bg-primary/10 ring-1 ring-inset ring-primary/40"
                  : "bg-transparent",
              )}
            >
              {items.map((os, idx) => (
                <KanbanCard
                  key={os.id}
                  os={os}
                  index={idx}
                  canAdvance={canAdvanceCards}
                  onKeyboardAdvance={onKeyboardAdvance}
                />
              ))}
              {provided.placeholder}
              {items.length === 0 && (
                <div className="flex h-12 items-center justify-center text-[9px] text-muted-foreground">
                  —
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}
