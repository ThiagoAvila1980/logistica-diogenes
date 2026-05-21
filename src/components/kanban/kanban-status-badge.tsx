"use client";

import { cn } from "@/lib/utils";
import { getStatusVisual } from "@/lib/kanban/status-visual";
import type { OsStatus } from "@/db/schema";

type KanbanStatusBadgeProps = {
  status: OsStatus;
  compact?: boolean;
  className?: string;
};

/** Ícone + cor representando o sub-status da OS no card */
export function KanbanStatusBadge({
  status,
  compact = false,
  className,
}: KanbanStatusBadgeProps) {
  const visual = getStatusVisual(status);
  const Icon = visual.icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full p-0.5",
          visual.badgeClass,
          className,
        )}
        title={visual.label}
        aria-label={visual.label}
      >
        <Icon className="h-3 w-3" aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
        visual.badgeClass,
        className,
      )}
      title={visual.label}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{visual.label}</span>
    </span>
  );
}
