import type { LucideIcon } from "lucide-react";
import {
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
    dotClass: "bg-warning",
    badgeClass: "bg-warning/15 text-warning-foreground",
  },
  medicao_final: {
    icon: Ruler,
    dotClass: "bg-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  cortes: {
    icon: Scissors,
    dotClass: "bg-warning",
    badgeClass: "bg-warning/15 text-warning-foreground",
  },
  embalagem: {
    icon: Package,
    dotClass: "bg-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
  acessorios_plano: {
    icon: Boxes,
    dotClass: "bg-primary",
    badgeClass: "bg-primary/15 text-primary",
  },
  transporte_perfil: {
    icon: Truck,
    dotClass: "bg-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  transporte_estrutural: {
    icon: Truck,
    dotClass: "bg-info",
    badgeClass: "bg-info/15 text-info-foreground",
  },
  transporte_perfis_total: {
    icon: Truck,
    dotClass: "bg-primary",
    badgeClass: "bg-primary/15 text-primary",
  },
  transporte_acessorios: {
    icon: Truck,
    dotClass: "bg-primary",
    badgeClass: "bg-primary/15 text-primary",
  },
  transporte_levar_vidro: {
    icon: Truck,
    dotClass: "bg-success",
    badgeClass: "bg-success/15 text-success-foreground",
  },
  instalacao_estrutural: {
    icon: Wrench,
    dotClass: "bg-success",
    badgeClass: "bg-success/15 text-success-foreground",
  },
  instalacao_vidros: {
    icon: Wrench,
    dotClass: "bg-success",
    badgeClass: "bg-success/15 text-success-foreground",
  },
  concluido: {
    icon: CheckCircle2,
    dotClass: "bg-brass",
    badgeClass: "bg-brass/15 text-brass-foreground",
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
