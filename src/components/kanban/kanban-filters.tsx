"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_KANBAN_FILTERS,
  type KanbanFilters,
} from "@/lib/kanban/filter-orders";

const PRIORITY_OPTIONS: {
  value: KanbanFilters["priority"];
  label: string;
}[] = [
  { value: "all", label: "Todas" },
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

type KanbanFiltersBarProps = {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
  totalCount: number;
  filteredCount: number;
};

export function KanbanFiltersBar({
  filters,
  onChange,
  totalCount,
  filteredCount,
}: KanbanFiltersBarProps) {
  const hasActive =
    filters.priority !== "all" || filters.dateFrom || filters.dateTo;

  return (
    <section
      className="flex flex-wrap items-end gap-2 rounded-md border bg-card px-2 py-1.5 lg:gap-3 lg:px-3"
      aria-label="Filtros do kanban"
    >
      <div className="flex items-center gap-1.5 self-center">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="text-xs font-medium">Filtros</span>
        <span className="text-[10px] text-muted-foreground">
          {filteredCount}/{totalCount}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
        <div className="min-w-[7rem] flex-1">
          <label
            htmlFor="kanban-priority"
            className="mb-0.5 block text-[10px] text-muted-foreground"
          >
            Prioridade
          </label>
          <select
            id="kanban-priority"
            value={filters.priority}
            onChange={(e) =>
              onChange({
                ...filters,
                priority: e.target.value as KanbanFilters["priority"],
              })
            }
            className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[7rem] flex-1">
          <label
            htmlFor="kanban-date-from"
            className="mb-0.5 block text-[10px] text-muted-foreground"
          >
            De
          </label>
          <Input
            id="kanban-date-from"
            type="date"
            className="h-7 text-xs"
            value={filters.dateFrom}
            onChange={(e) =>
              onChange({ ...filters, dateFrom: e.target.value })
            }
          />
        </div>

        <div className="min-w-[7rem] flex-1">
          <label
            htmlFor="kanban-date-to"
            className="mb-0.5 block text-[10px] text-muted-foreground"
          >
            Até
          </label>
          <Input
            id="kanban-date-to"
            type="date"
            className="h-7 text-xs"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          />
        </div>
      </div>

      {hasActive && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-[10px]"
          onClick={() => onChange(DEFAULT_KANBAN_FILTERS)}
        >
          <X className="mr-1 h-3 w-3" />
          Limpar
        </Button>
      )}
    </section>
  );
}
