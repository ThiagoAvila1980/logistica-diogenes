"use client";

import { useCallback, useState } from "react";
import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import {
  completePasskeyAuthentication,
  completePasskeyRegistration,
  preparePasskeyStep,
} from "@/actions/passkey-actions";
import type { BiometricConfirmation } from "@/lib/auth/biometric-types";
import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";
import {
  createDevFallbackConfirmation,
  getWebAuthnSupport,
  isPlatformAuthenticatorAvailable,
} from "@/lib/auth/webauthn-browser";
import { getCurrentSession } from "@/actions/auth-actions";

type UseBiometricConfirmOptions = {
  osId: string;
  nextStatus: AdvanceTargetStatus;
};

function getClientOrigin(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

export function useBiometricConfirm({
  osId,
  nextStatus,
}: UseBiometricConfirmOptions) {
  const [confirmation, setConfirmation] = useState<BiometricConfirmation | null>(
    null,
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedDevFallback, setUsedDevFallback] = useState(false);

  const reset = useCallback(() => {
    setConfirmation(null);
    setError(null);
    setUsedDevFallback(false);
  }, []);

  const confirm = useCallback(async () => {
    setIsConfirming(true);
    setError(null);
    setUsedDevFallback(false);

    try {
      const clientOrigin = getClientOrigin();
      const stepResult = await preparePasskeyStep({
        osId,
        nextStatus,
        clientOrigin,
      });
      if (!stepResult.success) {
        throw new Error(stepResult.message);
      }

      const support = getWebAuthnSupport();
      if (!support.available) {
        if (stepResult.devFallbackAllowed) {
          const session = await getCurrentSession();
          const fallback = createDevFallbackConfirmation(
            stepResult.challengeToken,
            session?.userId,
          );
          setConfirmation(fallback);
          setUsedDevFallback(true);
          return fallback;
        }
        throw new Error(
          support.reason ??
            "Biometria indisponível neste dispositivo. Use HTTPS com domínio válido.",
        );
      }

      const platformAvailable = await isPlatformAuthenticatorAvailable();
      if (!platformAvailable) {
        throw new Error(
          "Este aparelho não expõe autenticador biométrico ao navegador. " +
            "Verifique se a digital está cadastrada no sistema e use Chrome/Safari atualizado.",
        );
      }

      let result: BiometricConfirmation;

      if (stepResult.step === "register") {
        const registration = (await startRegistration({
          optionsJSON:
            stepResult.options as PublicKeyCredentialCreationOptionsJSON,
        })) as RegistrationResponseJSON;

        const completed = await completePasskeyRegistration({
          osId,
          nextStatus,
          challengeToken: stepResult.challengeToken,
          clientOrigin,
          registration,
        });

        if (!completed.success) {
          throw new Error(completed.message);
        }
        result = completed.confirmation;
      } else {
        const authentication = (await startAuthentication({
          optionsJSON:
            stepResult.options as PublicKeyCredentialRequestOptionsJSON,
        })) as AuthenticationResponseJSON;

        const completed = await completePasskeyAuthentication({
          osId,
          nextStatus,
          challengeToken: stepResult.challengeToken,
          clientOrigin,
          authentication,
        });

        if (!completed.success) {
          throw new Error(completed.message);
        }
        result = completed.confirmation;
      }

      setConfirmation(result);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha na confirmação biométrica";
      setError(message);
      throw err;
    } finally {
      setIsConfirming(false);
    }
  }, [osId, nextStatus]);

  return {
    confirmation,
    isConfirmed: !!confirmation,
    isConfirming,
    error,
    usedDevFallback,
    confirm,
    reset,
  };
}
