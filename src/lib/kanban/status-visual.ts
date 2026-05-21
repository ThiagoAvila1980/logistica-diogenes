import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleDot,
  FileText,
  Package,
  Ruler,
  Scissors,
  Truck,
  Wrench,
} from "lucide-react";
import type { OsStatus } from "@/db/schema";
import { kanbanColumnTitle } from "@/lib/kanban/column-labels";
import { normalizeKanbanStatus } from "@/lib/kanban/column-groups";

export type StatusVisual = {
  icon: LucideIcon;
  /** Bolinha / ícone preenchido */
  dotClass: string;
  /** Fundo do badge */
  badgeClass: string;
  label: string;
};

const DEFAULT_VISUAL: StatusVisual = {
  icon: CircleDot,
  dotClass: "bg-muted-foreground",
  badgeClass: "bg-muted text-muted-foreground",
  label: "—",
};

const STATUS_VISUAL: Partial<Record<OsStatus, Omit<StatusVisual, "label">>> = {
  medicao_orcamento: {
    icon: FileText,
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  medicao_final: {
    icon: Ruler,
    dotClass: "bg-sky-500",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  cortes: {
    icon: Scissors,
    dotClass: "bg-orange-500",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  },
  embalagem: {
    icon: Package,
    dotClass: "bg-yellow-500",
    badgeClass: "bg-yellow-500/15 text-yellow-800 dark:text-yellow-400",
  },
  acessorios_plano: {
    icon: Boxes,
    dotClass: "bg-violet-500",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  },
  transporte_perfil: {
    icon: Truck,
    dotClass: "bg-teal-500",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  },
  transporte_estrutural: {
    icon: Truck,
    dotClass: "bg-cyan-500",
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  },
  transporte_perfis_total: {
    icon: Truck,
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  },
  transporte_acessorios: {
    icon: Truck,
    dotClass: "bg-indigo-500",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  },
  transporte_levar_vidro: {
    icon: Truck,
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  instalacao_estrutural: {
    icon: Wrench,
    dotClass: "bg-lime-600",
    badgeClass: "bg-lime-500/15 text-lime-800 dark:text-lime-400",
  },
  instalacao_vidros: {
    icon: Wrench,
    dotClass: "bg-green-500",
    badgeClass: "bg-green-500/15 text-green-700 dark:text-green-400",
  },
  concluido: {
    icon: CheckCircle2,
    dotClass: "bg-emerald-600",
    badgeClass: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400",
  },
  revisao: {
    icon: AlertTriangle,
    dotClass: "bg-red-500",
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400",
  },
};

export function getStatusVisual(status: OsStatus): StatusVisual {
  const normalized = normalizeKanbanStatus(status);
  const config = STATUS_VISUAL[normalized] ?? STATUS_VISUAL[status];
  if (!config) {
    return { ...DEFAULT_VISUAL, label: kanbanColumnTitle(status) };
  }
  return {
    ...config,
    label: kanbanColumnTitle(normalized),
  };
}
