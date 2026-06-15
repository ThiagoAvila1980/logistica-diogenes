"use client";

import type React from "react";
import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical, BadgeCheck } from "lucide-react";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { getOsModuleHrefForKanbanPhase } from "@/lib/os-module-href";
import { cn } from "@/lib/utils";
import type { KanbanOrderItem } from "@/lib/data/kanban";
import { INSTALLATION_STEP_LABELS } from "@/components/dashboard/workflow-step-badges";

const PRIORITY_BORDER: Record<string, string> = {
  normal: "border-l-border",
  alta: "border-l-brass",
  urgente: "border-l-destructive",
};

const MEASUREMENT_PHASE = "medicao";
const CUTTING_PHASE = "plano_corte";
const TRANSPORT_PHASE = "transporte";
const INSTALLATION_PHASE = "instalacao";
const CONCLUDED_PHASE = "concluidos";

type KanbanCardProps = {
  os: KanbanOrderItem;
  phaseId: string;
  placementKey: string;
  isParallelPlacement?: boolean;
  index: number;
  canAdvance?: boolean;
  onKeyboardAdvance?: (osId: string) => void;
  variant?: "default" | "carousel";
};

function kanbanCardTextClasses(variant: "default" | "carousel") {
  if (variant === "carousel") {
    return {
      card: "text-[13.2px]",
      orderNumber: "text-[12.1px] sm:text-[13.2px]",
      clientName: "text-[11px] sm:text-[13.2px]",
      badge: "text-[9.9px] sm:text-[12.1px]",
    };
  }

  return {
    card: "text-xs",
    orderNumber: "text-[11px] sm:text-[12px]",
    clientName: "text-[10px] sm:text-[12px]",
    badge: "text-[9px] sm:text-[11px]",
  };
}

export function KanbanCard({
  os,
  phaseId,
  placementKey,
  isParallelPlacement = false,
  index,
  canAdvance,
  onKeyboardAdvance,
  variant = "default",
}: KanbanCardProps) {
  const text = kanbanCardTextClasses(variant);
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
  const detailHref = getOsModuleHrefForKanbanPhase(
    os.id,
    phaseId,
    os.status,
  );
  const isMeasurementColumn = phaseId === MEASUREMENT_PHASE;
  const isFinal = os.type === "final";
  const isCuttingColumn = phaseId === CUTTING_PHASE;
  const isTransportColumn = phaseId === TRANSPORT_PHASE;
  const isInstallationColumn = phaseId === INSTALLATION_PHASE;
  const isConcludedColumn = phaseId === CONCLUDED_PHASE;

  return (
    <Draggable
      draggableId={placementKey}
      index={index}
      isDragDisabled={isParallelPlacement}
    >
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={provided.draggableProps.style as React.CSSProperties}
          onKeyDown={handleKeyDown}
          className={cn(
            "mb-1.5 last:mb-0 min-w-0 max-w-full overflow-hidden rounded-md border border-l-[3px] bg-card transition-shadow sm:mb-2",
            text.card,
            priorityClass,
            snapshot.isDragging
              ? "z-10 scale-[1.02] shadow-lg ring-1 ring-primary/40"
              : "shadow-sm hover:shadow-md",
          )}
          data-testid={`kanban-card-${os.id}-${phaseId}`}
          title={`${displayNumber} · ${os.clientName}${os.scheduledDate ? ` · ${formatBrDate(os.scheduledDate)}` : ""}`}
        >
          <div className="flex min-w-0 items-start gap-1 p-1.5 sm:gap-1.5 sm:p-2">
            <button
              type="button"
              className={cn(
                "mt-0.5 hidden shrink-0 rounded p-0.5 text-muted-foreground sm:inline-flex",
                isParallelPlacement
                  ? "cursor-default opacity-40"
                  : "cursor-grab hover:bg-muted active:cursor-grabbing",
              )}
              {...(isParallelPlacement ? {} : provided.dragHandleProps)}
              tabIndex={0}
              aria-label={`Arrastar orçamento ${displayNumber}`}
              onClick={(e) => e.preventDefault()}
              disabled={isParallelPlacement}
            >
              <GripVertical className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
              <div className="flex items-start justify-between gap-1">
                <Link
                  href={detailHref}
                  className={cn(
                    "block min-w-0 truncate font-mono font-semibold text-foreground outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring",
                    text.orderNumber,
                  )}
                  tabIndex={snapshot.isDragging ? -1 : 0}
                >
                  {displayNumber}
                </Link>
              </div>
              <Link
                href={detailHref}
                className={cn(
                  "block min-w-0 truncate text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
                  text.clientName,
                )}
                tabIndex={snapshot.isDragging ? -1 : 0}
              >
                {os.clientName}
              </Link>
              {isMeasurementColumn ? (
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1 py-px font-medium sm:px-1.5 sm:py-0.5",
                      text.badge,
                      os.hasMeasurement
                        ? "bg-success-subtle text-success-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {os.hasMeasurement ? "Medida" : "Pendente"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-1 py-px font-medium sm:px-1.5 sm:py-0.5",
                      text.badge,
                      isFinal
                        ? "bg-accent text-primary"
                        : "bg-warning-subtle text-warning-foreground",
                    )}
                  >
                    {isFinal ? "Final" : "Orçamento"}
                  </span>
                </div>
              ) : isCuttingColumn ? (
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {(
                    [
                      { key: "corte", label: "Corte" },
                      { key: "embalagem", label: "Embal." },
                      { key: "acessorios", label: "Acess." },
                      { key: "vidros", label: "Vidr." },
                    ] as const
                  ).map(({ key, label }) => {
                    const done = os.cuttingSteps?.[key] ?? false;
                    return (
                      <span
                        key={key}
                        className={cn(
                          "inline-flex items-center rounded-full px-1 py-px font-medium sm:px-1.5 sm:py-0.5",
                      text.badge,
                          done
                            ? "bg-success-subtle text-success-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              ) : isTransportColumn ? (
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {(
                    [
                      { key: "levarPerfilEstrutural", label: "Perf." },
                      { key: "levarPerfilTotal", label: "Total" },
                      { key: "levarAcessorios", label: "Ac." },
                      { key: "levarVidros", label: "Vidr." },
                    ] as const
                  ).map(({ key, label }) => {
                    const done = os.transportSteps?.[key] ?? false;
                    return (
                      <span
                        key={key}
                        className={cn(
                          "inline-flex items-center rounded-full px-1 py-px font-medium sm:px-1.5 sm:py-0.5",
                      text.badge,
                          done
                            ? "bg-success-subtle text-success-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              ) : isInstallationColumn ? (
                <div className="flex flex-wrap gap-0.5 sm:gap-1">
                  {INSTALLATION_STEP_LABELS.map(({ key, label }) => {
                    const done = os.installationSteps?.[key] ?? false;
                    return (
                      <span
                        key={key}
                        className={cn(
                          "inline-flex items-center rounded-full px-1 py-px font-medium sm:px-1.5 sm:py-0.5",
                          text.badge,
                          done
                            ? "bg-success-subtle text-success-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              ) : isConcludedColumn ? (
                <span
                  className="inline-flex items-center text-success"
                  title="Concluído"
                  aria-label="Concluído"
                >
                  <BadgeCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                </span>
              ) : null}
            </div>
          </div>
        </article>
      )}
    </Draggable>
  );
}
