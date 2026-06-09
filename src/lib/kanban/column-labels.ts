import type { OsStatus } from "@/db/schema";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";

/** Rótulos curtos para sub-status dentro das 4 colunas do Kanban */
export const KANBAN_SHORT_LABELS: Record<OsStatus, string> = {
  medicao_orcamento: "Orçamento",
  medicao_final: "Final",
  cortes: "Cortes",
  embalagem: "Embalagem",
  acessorios_plano: "Acessórios",
  transporte_perfil: "Perfil",
  transporte_estrutural: "Estrutural",
  transporte_perfis_total: "Perfis total",
  transporte_acessorios: "Acessórios",
  transporte_levar_vidro: "Levar vidro",
  instalacao_estrutural: "Inst. estrutural",
  instalacao_vidros: "Inst. vidros",
  concluido: "Concluído",
};

export function kanbanColumnTitle(status: OsStatus): string {
  return KANBAN_SHORT_LABELS[status] ?? STATUS_LABELS[status];
}

export function kanbanColumnTooltip(status: OsStatus): string {
  return STATUS_LABELS[status];
}
