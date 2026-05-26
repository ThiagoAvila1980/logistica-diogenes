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
  // Legado
  orcamento_enviado: "Orçamento",
  aprovado_cliente: "Aprovado",
  os_gerada: "OS gerada",
  em_corte: "Corte",
  corte_concluido: "Corte OK",
  em_transporte: "Transporte",
  transporte_entregue: "Entrega",
  instalacao_final: "Inst. final",
};

export function kanbanColumnTitle(status: OsStatus): string {
  return KANBAN_SHORT_LABELS[status] ?? STATUS_LABELS[status];
}

export function kanbanColumnTooltip(status: OsStatus): string {
  return STATUS_LABELS[status];
}
