import type { OsStatus } from "@/db/schema";
import { getAdvanceFlow } from "./measurement-flow";

/** Fluxo linear de avanço */
export function getAdvanceStatusFlow(): Partial<Record<OsStatus, OsStatus[]>> {
  return getAdvanceFlow();
}

/** @deprecated Use getAdvanceStatusFlow() */
export const ADVANCE_STATUS_FLOW: Partial<Record<OsStatus, OsStatus[]>> =
  getAdvanceFlow();

export const ADVANCE_TARGET_STATUSES = [
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
] as const;

export type AdvanceTargetStatus = (typeof ADVANCE_TARGET_STATUSES)[number];

export function isAllowedAdvance(
  from: OsStatus,
  to: AdvanceTargetStatus,
): boolean {
  return getAdvanceStatusFlow()[from]?.includes(to) ?? false;
}

/** Próximo passo linear (primeiro permitido no fluxo) */
export function getNextAdvanceStep(
  from: OsStatus,
): AdvanceTargetStatus | null {
  const next = getAdvanceStatusFlow()[from]?.[0];
  return (next as AdvanceTargetStatus | undefined) ?? null;
}
