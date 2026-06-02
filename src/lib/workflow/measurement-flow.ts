import type { OsStatus } from "@/db/schema";

/** Pipeline operacional — 4 fases, 13 sub-status */
const MEASUREMENT_PIPELINE: Partial<Record<OsStatus, OsStatus[]>> = {
  medicao_orcamento: ["medicao_final"],
  medicao_final: ["cortes"],
  cortes: ["embalagem"],
  embalagem: ["acessorios_plano"],
  acessorios_plano: ["transporte_perfil"],
  transporte_perfil: ["transporte_estrutural"],
  transporte_estrutural: ["transporte_perfis_total"],
  transporte_perfis_total: ["transporte_acessorios"],
  transporte_acessorios: ["transporte_levar_vidro"],
  transporte_levar_vidro: ["instalacao_estrutural"],
  instalacao_estrutural: ["instalacao_vidros"],
  instalacao_vidros: ["concluido"],
  concluido: [],
  // Legado — registros históricos sem transições permitidas
  orcamento_enviado: [],
  aprovado_cliente: [],
  os_gerada: [],
  em_corte: [],
  corte_concluido: [],
  em_transporte: [],
  transporte_entregue: [],
  instalacao_final: [],
};

export function getStatusFlowForMeasurement(): Partial<
  Record<OsStatus, OsStatus[]>
> {
  return MEASUREMENT_PIPELINE;
}

export function getAllowedTransitions(from: OsStatus): OsStatus[] {
  return MEASUREMENT_PIPELINE[from] ?? [];
}

export function canTransitionWithFlow(from: OsStatus, to: OsStatus): boolean {
  if (from === to) return false;
  return getAllowedTransitions(from).includes(to);
}

export function getAdvanceFlow(): Partial<Record<OsStatus, OsStatus[]>> {
  return MEASUREMENT_PIPELINE;
}

/** Etapas visuais do wizard (ordem de execução) */
export function getWizardStepsForFlow(): OsStatus[] {
  return [
    "medicao_orcamento",
    "medicao_final",
    "cortes",
    "embalagem",
    "acessorios_plano",
    "transporte_perfil",
    "transporte_estrutural",
    "transporte_perfis_total",
    "transporte_acessorios",
    "transporte_levar_vidro",
    "instalacao_estrutural",
    "instalacao_vidros",
    "concluido",
  ];
}

export function getStepIndexForFlow(status: OsStatus): number {
  return getWizardStepsForFlow().indexOf(status);
}

export function getPrimaryNextStatusForFlow(
  current: OsStatus,
): OsStatus | null {
  return getAllowedTransitions(current)[0] ?? null;
}
