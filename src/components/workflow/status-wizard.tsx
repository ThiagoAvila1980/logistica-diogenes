"use client";

import type { LucideIcon } from "lucide-react";
import {
  Ruler,
  FileText,
  CheckCircle,
  Scissors,
  Package,
  Truck,
  Wrench,
  AlertTriangle,
  ClipboardList,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { OsStatus } from "@/db/schema";
import {
  getStepIndex,
  WIZARD_STEPS,
} from "@/lib/workflow/status-machine";
import {
  kanbanColumnTitle,
  kanbanColumnTooltip,
} from "@/lib/kanban/column-labels";

const STEP_ICONS: Record<OsStatus, LucideIcon> = {
  medicao_orcamento: Ruler,
  medicao_final: Ruler,
  cortes: Scissors,
  embalagem: Package,
  acessorios_plano: Package,
  transporte_perfil: Truck,
  transporte_estrutural: Truck,
  transporte_perfis_total: Truck,
  transporte_acessorios: Truck,
  transporte_levar_vidro: Truck,
  instalacao_estrutural: Wrench,
  instalacao_vidros: Wrench,
  concluido: CheckCircle,
  revisao: AlertTriangle,
  // Legado
  orcamento_enviado: FileText,
  aprovado_cliente: CheckCircle,
  os_gerada: ClipboardList,
  em_corte: Scissors,
  corte_concluido: Scissors,
  em_transporte: Truck,
  transporte_entregue: Package,
  instalacao_final: CheckCircle,
};

export type StatusWizardProps = {
  currentStatus: OsStatus;
  className?: string;
  overdueSteps?: OsStatus[];
  /** Indica atualização otimista em andamento */
  pending?: boolean;
};

export function StatusWizard({
  currentStatus,
  className,
  overdueSteps = [],
  pending = false,
}: StatusWizardProps) {
  const steps = WIZARD_STEPS;
  const currentIndex =
    currentStatus === "revisao" ? -1 : getStepIndex(currentStatus);

  return (
    <div className={cn("w-full", className)}>
      {currentStatus === "revisao" && (
        <Badge
          variant="destructive"
          className="mb-4 flex w-fit items-center gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {kanbanColumnTitle("revisao")}
        </Badge>
      )}

      <div
        className={cn(
          "flex items-start gap-0 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:items-center md:pb-0",
        )}
        role="list"
        aria-label="Progresso da ordem de serviço"
      >
        {steps.map((status, idx) => {
          const isPast = currentIndex >= 0 && idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = STEP_ICONS[status] ?? Circle;
          const isOverdue = overdueSteps.includes(status);
          const label = kanbanColumnTitle(status);
          const tooltip = kanbanColumnTooltip(status);

          return (
            <div key={status} className="group flex shrink-0 items-start">
              <div className="flex w-[3.25rem] flex-col items-center gap-0.5 sm:w-[3.75rem] md:w-auto md:flex-row md:items-center md:gap-0">
                <div
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    "h-7 w-7 md:h-10 md:w-10",
                    isCurrent &&
                      "border-green-600 bg-green-600 text-white shadow-sm ring-2 ring-green-500/35 ring-offset-1 md:ring-offset-2",
                    isPast &&
                      !isCurrent &&
                      "border-primary bg-primary text-primary-foreground",
                    !isPast &&
                      !isCurrent &&
                      "border-muted-foreground/30 bg-muted text-muted-foreground",
                    isOverdue && "ring-2 ring-destructive ring-offset-1 md:ring-offset-2",
                    pending && isCurrent && "animate-pulse",
                  )}
                  title={tooltip}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 md:h-5 md:w-5",
                      pending && isCurrent && "opacity-90",
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "max-w-[3.25rem] text-center text-[10px] font-medium leading-tight sm:max-w-[3.75rem] md:ml-2 md:max-w-none md:whitespace-nowrap md:text-sm",
                    isCurrent && "font-semibold text-green-700 dark:text-green-400",
                    isPast && !isCurrent && "text-foreground",
                    !isPast && !isCurrent && "text-muted-foreground",
                  )}
                  title={tooltip}
                >
                  {label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-0.5 mt-3.5 h-0.5 w-3 shrink-0 transition-colors duration-300 sm:w-4 md:mx-2 md:mt-0 md:w-12 lg:w-16",
                    isPast || isCurrent
                      ? "bg-primary"
                      : "bg-muted-foreground/20",
                  )}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

