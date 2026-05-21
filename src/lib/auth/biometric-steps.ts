import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";

/** Etapas que exigem confirmação biométrica do usuário logado antes do avanço. */
export const BIOMETRIC_REQUIRED_STEPS: ReadonlySet<AdvanceTargetStatus> =
  new Set([
    "medicao_final",
    "embalagem",
    "transporte_levar_vidro",
    "instalacao_estrutural",
    "instalacao_vidros",
    "concluido",
  ]);

export function requiresBiometricConfirmation(
  status: AdvanceTargetStatus,
): boolean {
  return BIOMETRIC_REQUIRED_STEPS.has(status);
}
