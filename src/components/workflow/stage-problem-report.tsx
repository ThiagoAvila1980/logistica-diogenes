"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  sendStageProblemAlertAction,
  type SendStageProblemAlertResult,
} from "@/actions/stage-alert-actions";
import type { StageAlertType } from "@/lib/notifications/stage-alerts";
import { cn } from "@/lib/utils";

type Props = {
  osId: string;
  stage: StageAlertType;
  className?: string;
  variant?: "inline" | "card-header";
};

const STAGE_LABELS: Record<StageAlertType, string> = {
  measurement: "medição",
  cutting: "corte",
  transport: "transporte",
  installation: "instalação",
};

export function StageProblemReport({
  osId,
  stage,
  className,
  variant = "inline",
}: Props) {
  const [showAlert, setShowAlert] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [alertPending, startAlertTransition] = useTransition();
  const [alertResult, setAlertResult] = useState<SendStageProblemAlertResult | null>(
    null,
  );
  const [alertSuccess, setAlertSuccess] = useState(false);

  function handleSendAlert() {
    if (!alertText.trim()) return;
    setAlertResult(null);
    startAlertTransition(async () => {
      const result = await sendStageProblemAlertAction({
        osId,
        stage,
        message: alertText.trim(),
      });
      setAlertResult(result);
      if (result.success) {
        setAlertText("");
        setShowAlert(false);
        setAlertSuccess(true);
      }
    });
  }

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 gap-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20",
        variant === "card-header" && "shrink-0",
        className,
      )}
      onClick={() => {
        setShowAlert((v) => !v);
        setAlertResult(null);
      }}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      Reportar problema
    </Button>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {variant === "card-header" ? trigger : (
        <div className="flex justify-end">{trigger}</div>
      )}

      {alertSuccess && (
        <Alert className="border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20">
          <AlertDescription className="text-sky-800 dark:text-sky-300">
            Notificação enviada para admin e gerente.
          </AlertDescription>
        </Alert>
      )}

      {showAlert && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
            Descreva o problema na etapa de {STAGE_LABELS[stage]} para notificar
            admin e gerente:
          </p>
          <Textarea
            placeholder="Descreva o problema com detalhes..."
            value={alertText}
            onChange={(e) => setAlertText(e.target.value)}
            rows={3}
            className="mb-3 text-sm"
          />
          {alertResult && !alertResult.success && (
            <Alert variant="destructive" className="mb-2">
              <AlertDescription>{alertResult.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              type="button"
              onClick={handleSendAlert}
              disabled={alertPending || !alertText.trim()}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700"
            >
              {alertPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Enviar notificação
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => setShowAlert(false)}
              disabled={alertPending}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
