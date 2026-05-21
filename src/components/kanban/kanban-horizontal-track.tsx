"use client";

import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { KANBAN_VISIBLE_COLUMNS } from "@/lib/kanban/constants";

type KanbanHorizontalTrackProps = {
  page: number;
  columnCount: number;
  visibleColumns?: number;
  children: ReactNode;
  className?: string;
};

export function getKanbanPageCount(
  columnCount: number,
  visibleColumns = KANBAN_VISIBLE_COLUMNS,
): number {
  return Math.max(1, Math.ceil(columnCount / visibleColumns));
}

export function getKanbanPageLabel(
  page: number,
  columnCount: number,
  visibleColumns = KANBAN_VISIBLE_COLUMNS,
): string {
  const start = page * visibleColumns + 1;
  const end = Math.min((page + 1) * visibleColumns, columnCount);
  return `Fases ${start}–${end} de ${columnCount}`;
}

export function KanbanHorizontalTrack({
  page,
  columnCount,
  visibleColumns = KANBAN_VISIBLE_COLUMNS,
  children,
  className,
}: KanbanHorizontalTrackProps) {
  const trackWidthPct = (columnCount / visibleColumns) * 100;
  const offsetPct = (page * visibleColumns / columnCount) * 100;
  const slotWidthPct = 100 / columnCount;
  const items = Children.toArray(children);

  return (
    <div className={cn("w-full overflow-hidden", className)}>
      <div
        className="flex gap-1 transition-transform duration-300 ease-out"
        style={{
          width: `${trackWidthPct}%`,
          transform: `translateX(-${offsetPct}%)`,
        }}
      >
        {items.map((child, index) => (
          <div
            key={index}
            className="min-w-0 shrink-0"
            style={{ width: `${slotWidthPct}%` }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
