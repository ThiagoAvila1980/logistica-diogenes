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
  revisao: [],
  // Legado
  orcamento_enviado: ["revisao"],
  aprovado_cliente: ["revisao"],
  os_gerada: ["revisao"],
  em_corte: ["revisao"],
  corte_concluido: ["revisao"],
  em_transporte: ["revisao"],
  transporte_entregue: ["revisao"],
  instalacao_final: ["revisao"],
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
  revisao: "Em revisão",
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

/** Próximo status no fluxo linear (exclui revisão) */
export function getNextLinearStatus(current: OsStatus): OsStatus | null {
  if (current === "revisao" || current === "concluido") return null;
  const steps = getWizardStepsForFlow();
  const idx = steps.indexOf(current);
  if (idx < 0 || idx >= steps.length - 1) return null;
  return steps[idx + 1] ?? null;
}

/** Transições de avanço (primeira do fluxo, sem revisão) */
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
  transportItemsChecked: Record<string, boolean> | null;
  installationHasPhotos: boolean;
  revisionFromStatus: OsStatus | null;
};

export type TransitionErrorCode =
  | "INVALID_TRANSITION"
  | "MISSING_BUDGET_MEASUREMENT"
  | "MISSING_FINAL_MEASUREMENT"
  | "CUTTING_NOT_COMPLETE"
  | "PACKAGING_INCOMPLETE"
  | "ACCESSORIES_INCOMPLETE"
  | "TRANSPORT_INCOMPLETE"
  | "INSTALLATION_PHOTOS_REQUIRED"
  | "BIOMETRIC_CONFIRMATION_REQUIRED"
  | "REVISION_TARGET_INVALID"
  | "REVISION_REASON_REQUIRED";

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
  if (
    !canTransition(from, to) &&
    !(from === "revisao" && to !== "revisao")
  ) {
    throw new TransitionValidationError(
      "INVALID_TRANSITION",
      `Transição não permitida: ${from} → ${to}`,
    );
  }

  if (to === "revisao") {
    return;
  }

  if (from === "revisao") {
    if (!ctx.revisionFromStatus || to !== ctx.revisionFromStatus) {
      throw new TransitionValidationError(
        "REVISION_TARGET_INVALID",
        "Ao sair de revisão, o destino deve ser o status anterior registrado.",
      );
    }
    return;
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

  if (to === "concluido" && !ctx.installationHasPhotos) {
    throw new TransitionValidationError(
      "INSTALLATION_PHOTOS_REQUIRED",
      "Instalação exige fotos antes e depois.",
    );
  }
}

export function isPackagingComplete(
  packaging: Record<string, boolean> | null | undefined,
): boolean {
  if (!packaging) return false;
  const required = [
    "structuralProfile",
    "totalProfiles",
    "accessories",
    "glass",
  ] as const;
  return required.every((key) => packaging[key] === true);
}

export function isAccessoriesComplete(
  accessories: Record<string, number> | null | undefined,
): boolean {
  if (!accessories) return false;
  return Object.keys(accessories).length > 0;
}

export function isTransportStepComplete(
  items: Record<string, boolean> | null | undefined,
  step:
    | "transporte_perfil"
    | "transporte_estrutural"
    | "transporte_perfis_total"
    | "transporte_acessorios"
    | "transporte_levar_vidro",
): boolean {
  if (!items) return false;
  const keyMap: Record<string, string> = {
    transporte_perfil: "perfil",
    transporte_estrutural: "estrutural",
    transporte_perfis_total: "perfisTotal",
    transporte_acessorios: "accessories",
    transporte_levar_vidro: "glass",
  };
  const key = keyMap[step];
  return items[key] === true;
}

export function isTransportFullyComplete(
  items: Record<string, boolean> | null | undefined,
): boolean {
  if (!items) return false;
  return (
    isTransportStepComplete(items, "transporte_perfil") &&
    isTransportStepComplete(items, "transporte_estrutural") &&
    isTransportStepComplete(items, "transporte_perfis_total") &&
    isTransportStepComplete(items, "transporte_acessorios") &&
    isTransportStepComplete(items, "transporte_levar_vidro")
  );
}
