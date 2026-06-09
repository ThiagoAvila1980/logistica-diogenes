"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import {
  countActiveKanbanFilters,
  DEFAULT_KANBAN_FILTERS,
  hasActiveKanbanFilters,
  type KanbanFilters,
} from "@/lib/kanban/filter-orders";
import { cn } from "@/lib/utils";

const PRIORITY_OPTIONS: {
  value: KanbanFilters["priority"];
  label: string;
}[] = [
  { value: "all", label: "Todas" },
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
  const [open, setOpen] = useState(() => hasActiveKanbanFilters(filters));
  const activeCount = countActiveKanbanFilters(filters);
  const hasActive = activeCount > 0;

  return (
    <section
      className="rounded-md border bg-muted/60"
      aria-label="Filtros do kanban"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left lg:px-3"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="kanban-filters-panel"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-xs font-medium">Filtros</span>
          <span className="text-[11px] text-muted-foreground">
            {filteredCount}/{totalCount}
          </span>
          {hasActive && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              {activeCount}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id="kanban-filters-panel"
          className="flex flex-wrap items-end gap-2 border-t px-2 py-2 lg:gap-3 lg:px-3"
        >
          <div className="min-w-[12rem] flex-1 basis-full sm:basis-[14rem]">
            <label
              htmlFor="kanban-search"
              className="mb-0.5 block text-[11px] text-muted-foreground"
            >
              Busca
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="kanban-search"
                type="search"
                placeholder="Cliente ou nº orçamento"
                className="h-7 pl-7 text-xs"
                value={filters.search}
                onChange={(event) =>
                  onChange({ ...filters, search: event.target.value })
                }
              />
            </div>
          </div>

          <div className="min-w-[7rem] flex-1 basis-[7rem]">
            <label
              htmlFor="kanban-priority"
              className="mb-0.5 block text-[11px] text-muted-foreground"
            >
              Prioridade
            </label>
            <Select
              id="kanban-priority"
              value={filters.priority}
              onChange={(event) =>
                onChange({
                  ...filters,
                  priority: event.target.value as KanbanFilters["priority"],
                })
              }
              className="h-7 px-2 text-xs"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[7rem] flex-1 basis-[7rem]">
            <label
              htmlFor="kanban-date-from"
              className="mb-0.5 block text-[11px] text-muted-foreground"
            >
              De
            </label>
            <DateInput
              id="kanban-date-from"
              className="h-7 text-xs"
              value={filters.dateFrom}
              onValueChange={(dateFrom) => onChange({ ...filters, dateFrom })}
            />
          </div>

          <div className="min-w-[7rem] flex-1 basis-[7rem]">
            <label
              htmlFor="kanban-date-to"
              className="mb-0.5 block text-[11px] text-muted-foreground"
            >
              Até
            </label>
            <DateInput
              id="kanban-date-to"
              className="h-7 text-xs"
              value={filters.dateTo}
              onValueChange={(dateTo) => onChange({ ...filters, dateTo })}
            />
          </div>

          {hasActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-[11px]"
              onClick={() => onChange(DEFAULT_KANBAN_FILTERS)}
            >
              <X className="mr-1 h-3 w-3" />
              Limpar
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
