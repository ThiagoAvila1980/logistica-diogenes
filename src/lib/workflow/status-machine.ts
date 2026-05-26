import type { OsStatus } from "@/db/schema";
import {
  canTransitionWithFlow,
  getAllowedTransitions,
  getPrimaryNextStatusForFlow,
  getStepIndexForFlow,
  getWizardStepsForFlow,
} from "./measurement-flow";

/** @deprecated Use getAllowedTransitions(from) — mantido para compatibilidade */
export const STATUS_FLOW: Record<OsStatus, OsStatus[]> = {
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
  // Legado
  orcamento_enviado: [],
  aprovado_cliente: [],
  os_gerada: [],
  em_corte: [],
  corte_concluido: [],
  em_transporte: [],
  transporte_entregue: [],
  instalacao_final: [],
};

/** Labels para UI (StatusWizard) */
export const STATUS_LABELS: Record<OsStatus, string> = {
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
  instalacao_estrutural: "Instalação estrutural",
  instalacao_vidros: "Instalação dos vidros",
  concluido: "Concluído",
  // Legado
  orcamento_enviado: "Orçamento enviado (legado)",
  aprovado_cliente: "Aprovado pelo cliente (legado)",
  os_gerada: "OS gerada (legado)",
  em_corte: "Em corte (legado)",
  corte_concluido: "Corte concluído (legado)",
  em_transporte: "Em transporte (legado)",
  transporte_entregue: "Transporte entregue (legado)",
  instalacao_final: "Instalação final (legado)",
};

/** Ordem visual padrão do pipeline */
export const WIZARD_STEPS: OsStatus[] = getWizardStepsForFlow();

export function canTransition(from: OsStatus, to: OsStatus): boolean {
  return canTransitionWithFlow(from, to);
}

export function getStepIndex(status: OsStatus): number {
  return getStepIndexForFlow(status);
}

/** Próximo status no fluxo linear */
export function getNextLinearStatus(current: OsStatus): OsStatus | null {
  if (current === "concluido") return null;
  const steps = getWizardStepsForFlow();
  const idx = steps.indexOf(current);
  if (idx < 0 || idx >= steps.length - 1) return null;
  return steps[idx + 1] ?? null;
}

/** Transições de avanço (primeira do fluxo) */
export function getPrimaryNextStatus(current: OsStatus): OsStatus | null {
  return getPrimaryNextStatusForFlow(current);
}

export { getAllowedTransitions, getWizardStepsForFlow };

export type CuttingSteps = {
  corteFeito: boolean;
  embalagemFeita: boolean;
  acessoriosFeitos: boolean;
};

export type TransitionContext = {
  hasFinalMeasurement: boolean;
  hasBudgetMeasurement?: boolean;
  cuttingSteps: CuttingSteps;
  installationComplete: boolean;
};

export type TransitionErrorCode =
  | "INVALID_TRANSITION"
  | "MISSING_BUDGET_MEASUREMENT"
  | "MISSING_FINAL_MEASUREMENT"
  | "CUTTING_NOT_COMPLETE"
  | "PACKAGING_INCOMPLETE"
  | "ACCESSORIES_INCOMPLETE"
  | "INSTALLATION_INCOMPLETE";

export class TransitionValidationError extends Error {
  constructor(
    public code: TransitionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TransitionValidationError";
  }
}

/**
 * Regras de negócio além do grafo de transições.
 */
export function assertTransitionGuards(
  from: OsStatus,
  to: OsStatus,
  ctx: TransitionContext,
): void {
  if (!canTransition(from, to)) {
    throw new TransitionValidationError(
      "INVALID_TRANSITION",
      `Transição não permitida: ${from} → ${to}`,
    );
  }

  if (to === "medicao_final" && !ctx.hasFinalMeasurement) {
    throw new TransitionValidationError(
      "MISSING_FINAL_MEASUREMENT",
      "Registre a medição final antes de avançar.",
    );
  }

  if (to === "cortes" && !ctx.hasFinalMeasurement) {
    throw new TransitionValidationError(
      "MISSING_FINAL_MEASUREMENT",
      "Libere o corte somente após vincular a medição final.",
    );
  }

  if (to === "embalagem" && !ctx.cuttingSteps.corteFeito) {
    throw new TransitionValidationError(
      "CUTTING_NOT_COMPLETE",
      "Conclua os cortes antes da embalagem.",
    );
  }

  if (to === "acessorios_plano" && !ctx.cuttingSteps.embalagemFeita) {
    throw new TransitionValidationError(
      "PACKAGING_INCOMPLETE",
      "Preencha o checklist de embalagem antes dos acessórios.",
    );
  }

  if (to === "transporte_perfil" && !ctx.cuttingSteps.acessoriosFeitos) {
    throw new TransitionValidationError(
      "ACCESSORIES_INCOMPLETE",
      "Registre os acessórios do plano de corte antes do transporte.",
    );
  }

  if (to === "concluido" && !ctx.installationComplete) {
    throw new TransitionValidationError(
      "INSTALLATION_INCOMPLETE",
      "Conclua as etapas de instalação antes de finalizar a OS.",
    );
  }
}
