"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { KANBAN_PHASES } from "@/lib/kanban/column-groups";
import { REPORT_PHASE_LABELS } from "@/lib/reports/service-journey";
import { ROLE_LABELS, ALL_USER_ROLES } from "@/lib/auth/permissions";
import type { UserRole } from "@/db/schema";
import type { SlaStatus } from "@/components/reports/sla-badge";
import { cn } from "@/lib/utils";

const PRIORITY_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
] as const;

const STAGE_OPTIONS = [
  { value: "all", label: "Todas" },
  ...KANBAN_PHASES.map((phase) => ({
    value: phase.id,
    label: REPORT_PHASE_LABELS[phase.id] ?? phase.shortTitle,
  })),
];

const SLA_OPTIONS: { value: "all" | SlaStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "ok", label: "No prazo" },
  { value: "warning", label: "Atenção" },
  { value: "critical", label: "Crítico" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "Todos" },
  ...ALL_USER_ROLES.filter((r) => r !== "admin" && r !== "gerente").map(
    (role) => ({
      value: role,
      label: ROLE_LABELS[role as UserRole],
    }),
  ),
];

export type ReportFiltersBarConfig = {
  search?: { placeholder: string; value: string; onChange: (value: string) => void };
  priority?: {
    value: "all" | "normal" | "alta" | "urgente";
    onChange: (value: "all" | "normal" | "alta" | "urgente") => void;
  };
  stage?: { value: string; onChange: (value: string) => void };
  dateRange?: {
    dateFrom: string;
    dateTo: string;
    onChange: (patch: { dateFrom?: string; dateTo?: string }) => void;
  };
  sla?: { value: "all" | SlaStatus; onChange: (value: "all" | SlaStatus) => void };
  role?: { value: string; onChange: (value: string) => void };
};

type ReportFiltersBarProps = {
  config: ReportFiltersBarConfig;
  activeCount: number;
  totalCount: number;
  filteredCount: number;
  onClear: () => void;
  defaultOpen?: boolean;
  panelId?: string;
};

export function ReportFiltersBar({
  config,
  activeCount,
  totalCount,
  filteredCount,
  onClear,
  defaultOpen = false,
  panelId = "report-filters-panel",
}: ReportFiltersBarProps) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);
  const hasActive = activeCount > 0;

  return (
    <section
      className="rounded-md border bg-muted/60"
      aria-label="Filtros do relatório"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left lg:px-3"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <Filter
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
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
          id={panelId}
          className="flex flex-wrap items-end gap-2 border-t px-2 py-2 lg:gap-3 lg:px-3"
        >
          {config.search && (
            <div className="min-w-48 flex-1 basis-full sm:basis-56">
              <label
                htmlFor={`${panelId}-search`}
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
                  id={`${panelId}-search`}
                  type="search"
                  placeholder={config.search.placeholder}
                  className="h-7 pl-7 text-xs"
                  value={config.search.value}
                  onChange={(event) =>
                    config.search!.onChange(event.target.value)
                  }
                />
              </div>
            </div>
          )}

          {config.priority && (
            <div className="min-w-28 flex-1 basis-28">
              <label
                htmlFor={`${panelId}-priority`}
                className="mb-0.5 block text-[11px] text-muted-foreground"
              >
                Prioridade
              </label>
              <Select
                id={`${panelId}-priority`}
                value={config.priority.value}
                onChange={(event) =>
                  config.priority!.onChange(
                    event.target.value as "all" | "normal" | "alta" | "urgente",
                  )
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
          )}

          {config.stage && (
            <div className="min-w-28 flex-1 basis-28">
              <label
                htmlFor={`${panelId}-stage`}
                className="mb-0.5 block text-[11px] text-muted-foreground"
              >
                Fase
              </label>
              <Select
                id={`${panelId}-stage`}
                value={config.stage.value}
                onChange={(event) => config.stage!.onChange(event.target.value)}
                className="h-7 px-2 text-xs"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {config.sla && (
            <div className="min-w-28 flex-1 basis-28">
              <label
                htmlFor={`${panelId}-sla`}
                className="mb-0.5 block text-[11px] text-muted-foreground"
              >
                Prazo
              </label>
              <Select
                id={`${panelId}-sla`}
                value={config.sla.value}
                onChange={(event) =>
                  config.sla!.onChange(event.target.value as "all" | SlaStatus)
                }
                className="h-7 px-2 text-xs"
              >
                {SLA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {config.role && (
            <div className="min-w-28 flex-1 basis-28">
              <label
                htmlFor={`${panelId}-role`}
                className="mb-0.5 block text-[11px] text-muted-foreground"
              >
                Papel
              </label>
              <Select
                id={`${panelId}-role`}
                value={config.role.value}
                onChange={(event) => config.role!.onChange(event.target.value)}
                className="h-7 px-2 text-xs"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {config.dateRange && (
            <>
              <div className="min-w-28 flex-1 basis-28">
                <label
                  htmlFor={`${panelId}-date-from`}
                  className="mb-0.5 block text-[11px] text-muted-foreground"
                >
                  De
                </label>
                <DateInput
                  id={`${panelId}-date-from`}
                  className="h-7 text-xs"
                  value={config.dateRange.dateFrom}
                  onValueChange={(dateFrom) =>
                    config.dateRange!.onChange({ dateFrom })
                  }
                />
              </div>
              <div className="min-w-28 flex-1 basis-28">
                <label
                  htmlFor={`${panelId}-date-to`}
                  className="mb-0.5 block text-[11px] text-muted-foreground"
                >
                  Até
                </label>
                <DateInput
                  id={`${panelId}-date-to`}
                  className="h-7 text-xs"
                  value={config.dateRange.dateTo}
                  onValueChange={(dateTo) =>
                    config.dateRange!.onChange({ dateTo })
                  }
                />
              </div>
            </>
          )}

          {hasActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 px-2 text-[11px]"
              onClick={onClear}
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
