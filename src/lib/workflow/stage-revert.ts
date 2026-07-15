import type { OsStatus } from "@/db/schema";
import { getPhaseIdForStatus } from "@/lib/kanban/column-groups";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

/**
 * Fases que podem ser desfeitas manualmente, uma etapa por vez.
 * A OS só pode voltar para a fase imediatamente anterior no fluxo:
 *   Instalação → Transporte
 *   Transporte → Plano de corte
 *   Plano de corte → Medição
 */
export type RevertablePhase = "plano_corte" | "transporte" | "instalacao";

/** Sub-status de destino (fronteira da fase anterior) para cada fase revertível. */
export const PHASE_REVERT_TARGET: Record<RevertablePhase, OsStatus> = {
  instalacao: "transporte_levar_vidro",
  transporte: "acessorios_plano",
  plano_corte: "medicao_final",
};

export const PHASE_LABEL: Record<RevertablePhase, string> = {
  plano_corte: "Plano de corte",
  transporte: "Transporte",
  instalacao: "Instalação",
};

/** Rótulo da fase anterior (para onde a OS vai voltar). */
export const PREVIOUS_PHASE_LABEL: Record<RevertablePhase, string> = {
  plano_corte: "Medição",
  transporte: "Plano de corte",
  instalacao: "Transporte",
};

/** Se a etapa atual pertence a uma fase que pode ser revertida, retorna qual. */
export function getRevertablePhase(status: OsStatus): RevertablePhase | null {
  const phaseId = getPhaseIdForStatus(status);
  if (
    phaseId === "plano_corte" ||
    phaseId === "transporte" ||
    phaseId === "instalacao"
  ) {
    return phaseId;
  }
  return null;
}

/** Etapa de destino ao voltar a partir de `status`, ou `null` se não for revertível. */
export function getPhaseRevertTarget(status: OsStatus): OsStatus | null {
  const phase = getRevertablePhase(status);
  return phase ? PHASE_REVERT_TARGET[phase] : null;
}

/** O vão possui algum progresso registrado na fase que está sendo abandonada? */
export function vaoHasProgressForPhase(
  item: MeasurementLineItem,
  phase: RevertablePhase,
): boolean {
  if (phase === "instalacao") return Boolean(item.installationProgress);
  if (phase === "transporte") return Boolean(item.transportProgress);
  return Boolean(item.cuttingProgress) || item.sentToCutting === true;
}

/** Remove por completo o progresso da fase abandonada de um vão (como se nunca tivesse ocorrido). */
export function clearVaoProgressForPhase(
  item: MeasurementLineItem,
  phase: RevertablePhase,
): MeasurementLineItem {
  if (phase === "instalacao") {
    const { installationProgress, ...rest } = item;
    void installationProgress;
    return rest;
  }
  if (phase === "transporte") {
    const { transportProgress, ...rest } = item;
    void transportProgress;
    return rest;
  }
  const { cuttingProgress, ...rest } = item;
  void cuttingProgress;
  return { ...rest, sentToCutting: false };
}
