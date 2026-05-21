import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";
import { requiresBiometricConfirmation } from "./biometric-steps";
import {
  challengeMatchesClientData,
  isDevBiometricFallbackAllowed,
  verifyBiometricChallengeToken,
} from "./biometric-challenge";
import {
  biometricConfirmationSchema,
  type BiometricConfirmation,
} from "./biometric-types";

export function validateBiometricConfirmation(
  nextStatus: AdvanceTargetStatus,
  osId: string,
  payload: Record<string, unknown> | undefined,
  sessionUserId?: string,
): string | null {
  if (!requiresBiometricConfirmation(nextStatus)) {
    return null;
  }

  const raw = payload?.biometricConfirmation;
  const parsed = biometricConfirmationSchema.safeParse(raw);
  if (!parsed.success) {
    return "Confirmação biométrica do usuário é obrigatória para esta etapa";
  }

  const confirmation = parsed.data;

  if (confirmation.authMethod === "dev_fallback") {
    if (!isDevBiometricFallbackAllowed()) {
      return "Confirmação biométrica simulada não permitida em produção";
    }
    if (!sessionUserId) {
      return "Faça login para confirmar esta etapa";
    }
    if (confirmation.userId && confirmation.userId !== sessionUserId) {
      return "Confirmação biométrica não corresponde ao usuário logado";
    }
    return verifyDevFallback(confirmation, osId, nextStatus);
  }

  if (confirmation.userId && sessionUserId && confirmation.userId !== sessionUserId) {
    return "Confirmação biométrica não corresponde ao usuário logado";
  }

  return verifyWebAuthnConfirmation(confirmation, osId, nextStatus);
}

function verifyDevFallback(
  confirmation: BiometricConfirmation,
  osId: string,
  nextStatus: AdvanceTargetStatus,
): string | null {
  const challenge = verifyBiometricChallengeToken(
    confirmation.challengeToken,
    osId,
    nextStatus,
  );
  if (!challenge.valid) return challenge.reason;
  return null;
}

function verifyWebAuthnConfirmation(
  confirmation: BiometricConfirmation,
  osId: string,
  nextStatus: AdvanceTargetStatus,
): string | null {
  const challenge = verifyBiometricChallengeToken(
    confirmation.challengeToken,
    osId,
    nextStatus,
  );
  if (!challenge.valid) return challenge.reason;

  if (
    !challengeMatchesClientData(
      challenge.challenge,
      confirmation.clientDataJSON,
    )
  ) {
    return "Confirmação biométrica inválida (desafio não confere)";
  }

  if (!confirmation.authenticatorData?.length) {
    return "Confirmação biométrica incompleta";
  }

  const confirmedAt = new Date(confirmation.confirmedAt).getTime();
  if (Number.isNaN(confirmedAt) || Date.now() - confirmedAt > 5 * 60 * 1000) {
    return "Confirmação biométrica expirada";
  }

  return null;
}
