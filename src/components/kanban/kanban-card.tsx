"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import { KanbanStatusBadge } from "./kanban-status-badge";

const MEASUREMENT_STATUSES = new Set(["medicao_orcamento", "medicao_final"]);

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
  const isMeasurementColumn = MEASUREMENT_STATUSES.has(os.status);
  const isFinal = os.status === "medicao_final";

  return (
    <Draggable draggableId={os.id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          onKeyDown={handleKeyDown}
          className={cn(
            "mb-1.5 last:mb-0 rounded-md border border-l-[3px] bg-card text-xs transition-shadow sm:mb-2",
            priorityClass,
            snapshot.isDragging
              ? "z-10 scale-[1.02] shadow-lg ring-1 ring-primary/40"
              : "shadow-sm hover:shadow-md",
          )}
          data-testid={`kanban-card-${os.id}`}
          title={`${displayNumber} · ${os.clientName}${os.scheduledDate ? ` · ${formatBrDate(os.scheduledDate)}` : ""}`}
        >
          <div className="flex items-start gap-1 p-1.5 sm:gap-1.5 sm:p-2">
            <button
              type="button"
              className="mt-0.5 shrink-0 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing max-sm:-ml-0.5"
              {...provided.dragHandleProps}
              tabIndex={0}
              aria-label={`Arrastar orçamento ${displayNumber}`}
              onClick={(e) => e.preventDefault()}
            >
              <GripVertical className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
              <div className="flex items-start justify-between gap-1">
                <Link
                  href={`/dashboard/${os.id}`}
                  className="truncate font-mono text-[10px] font-semibold text-foreground outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring sm:text-[11px]"
                  tabIndex={snapshot.isDragging ? -1 : 0}
                >
                  {displayNumber}
                </Link>
              </div>
              <Link
                href={`/dashboard/${os.id}`}
                className="hidden truncate text-[11px] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring sm:block"
                tabIndex={snapshot.isDragging ? -1 : 0}
              >
                {os.clientName}
              </Link>
              {isMeasurementColumn ? (
                <div className="flex flex-wrap gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      os.hasMeasurement
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {os.hasMeasurement ? "Medida" : "Liberada"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      isFinal
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                    )}
                  >
                    {isFinal ? "Final" : "Orçamento"}
                  </span>
                </div>
              ) : (
                <>
                  <KanbanStatusBadge
                    status={os.status}
                    compact
                    className="sm:hidden"
                  />
                  <KanbanStatusBadge
                    status={os.status}
                    className="hidden max-w-full sm:inline-flex"
                  />
                </>
              )}
            </div>
          </div>
        </article>
      )}
    </Draggable>
  );
}
