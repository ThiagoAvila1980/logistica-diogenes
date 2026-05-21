"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { cn } from "@/lib/utils";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import { KanbanStatusBadge } from "./kanban-status-badge";

const PRIORITY_BORDER: Record<string, string> = {
  baixa: "border-l-blue-500",
  normal: "border-l-border",
  alta: "border-l-orange-500",
  urgente: "border-l-red-500",
};

type KanbanCardProps = {
  os: KanbanOrderItem;
  index: number;
  canAdvance?: boolean;
  onKeyboardAdvance?: (osId: string) => void;
};

export function KanbanCard({
  os,
  index,
  canAdvance,
  onKeyboardAdvance,
}: KanbanCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.altKey &&
      e.key === "ArrowRight" &&
      canAdvance &&
      onKeyboardAdvance
    ) {
      e.preventDefault();
      onKeyboardAdvance(os.id);
    }
  };

  const priorityClass =
    PRIORITY_BORDER[os.priority] ?? PRIORITY_BORDER.normal;
  const displayNumber = getOrderDisplayNumber(os);

  return (
    <Draggable draggableId={os.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          onKeyDown={handleKeyDown}
          className={cn(
            "mb-2 last:mb-0 rounded-md border border-l-[3px] bg-card text-xs transition-shadow",
            priorityClass,
            snapshot.isDragging
              ? "z-10 scale-[1.02] shadow-lg ring-1 ring-primary/40"
              : "shadow-sm hover:shadow-md",
          )}
          data-testid={`kanban-card-${os.id}`}
          title={`${displayNumber} · ${os.clientName}${os.scheduledDate ? ` · ${new Date(os.scheduledDate).toLocaleDateString("pt-BR")}` : ""}`}
        >
          <div className="flex items-start gap-1.5 p-2">
            <button
              type="button"
              className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
              {...provided.dragHandleProps}
              tabIndex={0}
              aria-label={`Arrastar orçamento ${displayNumber}`}
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="h-3.5 w-3.5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-1">
                <Link
                  href={`/dashboard/${os.id}`}
                  className="truncate font-mono text-[11px] font-semibold text-foreground outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
                  tabIndex={snapshot.isDragging ? -1 : 0}
                >
                  {displayNumber}
                </Link>
              </div>
              <Link
                href={`/dashboard/${os.id}`}
                className="block truncate text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                tabIndex={snapshot.isDragging ? -1 : 0}
              >
                {os.clientName}
              </Link>
              <KanbanStatusBadge status={os.status} className="max-w-full" />
            </div>
          </div>
        </article>
      )}
    </Draggable>
  );
}
