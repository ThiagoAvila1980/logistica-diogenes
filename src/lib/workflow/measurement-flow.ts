import type { OsStatus } from "@/db/schema";

/** Pipeline operacional — 4 fases, 13 sub-status + revisão */
const MEASUREMENT_PIPELINE: Partial<Record<OsStatus, OsStatus[]>> = {
  medicao_orcamento: ["medicao_final", "revisao"],
  medicao_final: ["cortes", "revisao"],
  cortes: ["embalagem", "revisao"],
  embalagem: ["acessorios_plano", "revisao"],
  acessorios_plano: ["transporte_perfil", "revisao"],
  transporte_perfil: ["transporte_estrutural", "revisao"],
  transporte_estrutural: ["transporte_perfis_total", "revisao"],
  transporte_perfis_total: ["transporte_acessorios", "revisao"],
  transporte_acessorios: ["transporte_levar_vidro", "revisao"],
  transporte_levar_vidro: ["instalacao_estrutural", "revisao"],
  instalacao_estrutural: ["instalacao_vidros", "revisao"],
  instalacao_vidros: ["concluido", "revisao"],
  concluido: [],
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
  if (to === "revisao") return from !== "concluido";
  if (from === "revisao") return true;
  return getAllowedTransitions(from).includes(to);
}

/** Avanço linear (sem revisão) */
export function getAdvanceFlow(): Partial<Record<OsStatus, OsStatus[]>> {
  const result: Partial<Record<OsStatus, OsStatus[]>> = {};
  for (const [status, targets] of Object.entries(MEASUREMENT_PIPELINE)) {
    const linear = targets?.filter((t) => t !== "revisao") ?? [];
    if (linear.length > 0) {
      result[status as OsStatus] = linear;
    }
  }
  return result;
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
  if (status === "revisao") return -1;
  return getWizardStepsForFlow().indexOf(status);
}

export function getPrimaryNextStatusForFlow(
  current: OsStatus,
): OsStatus | null {
  const allowed = getAllowedTransitions(current).filter((s) => s !== "revisao");
  return allowed[0] ?? null;
}
