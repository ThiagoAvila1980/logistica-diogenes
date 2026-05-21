"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getKanbanPageCount,
  getKanbanPageLabel,
} from "./kanban-horizontal-track";
import { KANBAN_VISIBLE_COLUMNS } from "@/lib/kanban/constants";

type KanbanPageNavProps = {
  page: number;
  columnCount: number;
  visibleColumns?: number;
  onPageChange: (page: number) => void;
};

export function KanbanPageNav({
  page,
  columnCount,
  visibleColumns = KANBAN_VISIBLE_COLUMNS,
  onPageChange,
}: KanbanPageNavProps) {
  const totalPages = getKanbanPageCount(columnCount, visibleColumns);

  return (
    <div className="flex items-center justify-center gap-2 py-0.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={page <= 0}
        onClick={() => onPageChange(page - 1)}
        aria-label="Fases anteriores"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="min-w-[9rem] text-center text-xs text-muted-foreground">
        {getKanbanPageLabel(page, columnCount, visibleColumns)}
        {totalPages > 1 && (
          <span className="text-muted-foreground/70">
            {" "}
            · {page + 1}/{totalPages}
          </span>
        )}
      </span>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próximas fases"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
