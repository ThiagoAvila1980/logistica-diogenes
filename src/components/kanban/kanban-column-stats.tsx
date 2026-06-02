"use client";

import {
  computePhaseMetrics,
  formatAvgDuration,
  type ColumnMetric,
} from "@/lib/kanban/column-metrics";
import { KANBAN_VISIBLE_COLUMNS } from "@/lib/kanban/constants";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import { cn } from "@/lib/utils";
import { KanbanHorizontalTrack } from "./kanban-horizontal-track";

type KanbanColumnStatsProps = {
  orders: KanbanOrderItem[];
  phaseIds: string[];
  page: number;
  visibleColumns?: number;
};

export function KanbanColumnStats({
  orders,
  phaseIds,
  page,
  visibleColumns = KANBAN_VISIBLE_COLUMNS,
}: KanbanColumnStatsProps) {
  const metrics = computePhaseMetrics(orders, phaseIds);
  const withCards = metrics.filter((m) => m.count > 0);
  const maxHours = Math.max(...withCards.map((m) => m.avgHours), 1);

  if (withCards.length === 0) {
    return null;
  }

  return (
    <section
      className="hidden rounded-md border bg-card px-2 py-1.5 sm:block"
      aria-label="Tempo médio por coluna"
    >
      <div className="mb-1 text-[10px] font-medium text-muted-foreground">
        Tempo médio na coluna
      </div>
      <KanbanHorizontalTrack
        page={page}
        columnCount={phaseIds.length}
        visibleColumns={visibleColumns}
      >
        {phaseIds.map((phaseId) => {
          const metric = metrics.find((m) => m.phaseId === phaseId);
          if (!metric || metric.count === 0) {
            return <div key={phaseId} aria-hidden />;
          }
          return (
            <ColumnStatBar
              key={metric.phaseId}
              metric={metric}
              maxHours={maxHours}
            />
          );
        })}
      </KanbanHorizontalTrack>
    </section>
  );
}

function ColumnStatBar({
  metric,
  maxHours,
}: {
  metric: ColumnMetric;
  maxHours: number;
}) {
  const pct = Math.min(100, (metric.avgHours / maxHours) * 100);

  return (
    <div
      className="flex min-w-0 flex-col items-center gap-0.5"
      title={`${metric.label}: média ${formatAvgDuration(metric.avgHours)} (${metric.count} OS)`}
    >
      <div className="flex h-8 w-full max-w-[2.5rem] items-end justify-center rounded-sm bg-muted">
        <div
          className={cn(
            "w-full rounded-sm bg-primary transition-all",
            metric.avgHours > 48 && "bg-warning",
            metric.avgHours > 120 && "bg-destructive",
          )}
          style={{ height: `${Math.max(12, pct)}%` }}
          role="presentation"
          aria-hidden
        />
      </div>
      <span className="w-full truncate text-center text-[9px] tabular-nums text-muted-foreground">
        {formatAvgDuration(metric.avgHours)}
      </span>
    </div>
  );
}
