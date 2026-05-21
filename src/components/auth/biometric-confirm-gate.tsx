"use client";

import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBiometricConfirm } from "@/hooks/use-biometric-confirm";
import { requiresBiometricConfirmation } from "@/lib/auth/biometric-steps";
import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";
import type { BiometricConfirmation } from "@/lib/auth/biometric-types";
import { cn } from "@/lib/utils";

type BiometricConfirmGateProps = {
  osId: string;
  nextStatus: AdvanceTargetStatus;
  disabled?: boolean;
  onConfirmed?: (confirmation: BiometricConfirmation) => void;
  onReset?: () => void;
  className?: string;
};

export function BiometricConfirmGate({
  osId,
  nextStatus,
  disabled,
  onConfirmed,
  onReset,
  className,
}: BiometricConfirmGateProps) {
  const required = requiresBiometricConfirmation(nextStatus);
  const {
    confirmation,
    isConfirmed,
    isConfirming,
    error,
    usedDevFallback,
    confirm,
    reset,
  } = useBiometricConfirm({ osId, nextStatus });

  if (!required) return null;

  async function handleConfirm() {
    try {
      const result = await confirm();
      onConfirmed?.(result);
    } catch {
      /* error state handled in hook */
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/30 p-4 space-y-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Confirmação biométrica</p>
          <p className="text-xs text-muted-foreground">
            Confirme com Touch ID, Face ID ou impressão digital do seu
            dispositivo para registrar que você autorizou esta etapa.
          </p>
        </div>
      </div>

      {isConfirmed && confirmation ? (
        <Alert variant={usedDevFallback ? "default" : "success"}>
          <ShieldCheck className="h-4 w-4" />
          <AlertDescription>
            {usedDevFallback ? (
              <>
                Confirmação simulada (sem sensor) — defina{" "}
                <code className="text-xs">BIOMETRIC_ALLOW_DEV_FALLBACK=true</code>{" "}
                só para testes. No celular, use HTTPS (ngrok) para biometria real.
              </>
            ) : (
              <>
                Etapa confirmada biometricamente às{" "}
                {new Date(confirmation.confirmedAt).toLocaleTimeString("pt-BR")}.
              </>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={disabled || isConfirming}
          onClick={handleConfirm}
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Aguardando biometria…
            </>
          ) : (
            <>
              <Fingerprint className="mr-2 h-4 w-4" />
              Confirmar com biometria
            </>
          )}
        </Button>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {isConfirmed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            reset();
            onReset?.();
          }}
        >
          Refazer confirmação
        </Button>
      )}
    </div>
  );
}

export { requiresBiometricConfirmation };
