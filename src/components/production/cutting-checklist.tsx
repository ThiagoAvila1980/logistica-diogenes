"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { updateCuttingStepAction, sendCuttingAlertAction } from "@/actions/cutting-actions";

type Step = "corte" | "embalagem" | "acessorios";

type Props = {
  osId: string;
  initialSteps: { corte: boolean; embalagem: boolean; acessorios: boolean };
};

const STEPS: { key: Step; label: string; description: string }[] = [
  {
    key: "corte",
    label: "Corte",
    description: "Todos os perfis e peças cortados conforme medição",
  },
  {
    key: "embalagem",
    label: "Embalagem",
    description: "Material embalado e protegido para transporte",
  },
  {
    key: "acessorios",
    label: "Acessórios",
    description: "Dobradiças, parafusos e demais acessórios separados",
  },
];

export function CuttingChecklist({ osId, initialSteps }: Props) {
  const [steps, setSteps] = useState(initialSteps);
  const [loadingStep, setLoadingStep] = useState<Step | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const [showAlert, setShowAlert] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [alertPending, startAlertTransition] = useTransition();
  const [alertResult, setAlertResult] = useState<{
    success: boolean;
    message?: string;
  } | null>(null);
  const [alertSuccess, setAlertSuccess] = useState(false);

  const allDone = steps.corte && steps.embalagem && steps.acessorios;

  async function handleStepToggle(step: Step, done: boolean) {
    setLoadingStep(step);
    setStepError(null);
    const result = await updateCuttingStepAction({ osId, step, done });
    if (result.success) {
      setSteps((prev) => ({ ...prev, [step]: done }));
    } else {
      setStepError(result.message);
    }
    setLoadingStep(null);
  }

  function handleSendAlert() {
    if (!alertText.trim()) return;
    setAlertResult(null);
    startAlertTransition(async () => {
      const result = await sendCuttingAlertAction({
        osId,
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Etapas do corte</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-900/20"
          onClick={() => {
            setShowAlert((v) => !v);
            setAlertResult(null);
          }}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Reportar problema
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {stepError && (
          <Alert variant="destructive">
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STEPS.map(({ key, label, description }) => {
            const done = steps[key];
            const isLoading = loadingStep === key;
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                  done
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20"
                    : "border-border bg-card hover:bg-muted/50",
                  isLoading && "opacity-60",
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Checkbox
                    checked={done}
                    disabled={isLoading}
                    onCheckedChange={(v) => handleStepToggle(key, v === true)}
                    className={cn(
                      "shrink-0",
                      done &&
                        "border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-600",
                    )}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm font-semibold leading-tight",
                      done
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-foreground",
                    )}
                  >
                    {label}
                  </span>
                  <p
                    className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-muted-foreground"
                    title={description}
                  >
                    {description}
                  </p>
                </div>
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : null}
              </label>
            );
          })}
        </div>

        {alertSuccess && (
          <Alert className="border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900/20">
            <AlertDescription className="text-sky-800 dark:text-sky-300">
              Notificação push enviada para admin e gerente.
            </AlertDescription>
          </Alert>
        )}

        {allDone && (
          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-400">
              Todas as etapas concluídas! Esta OS está pronta para transporte.
            </AlertDescription>
          </Alert>
        )}

        {showAlert && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              Descreva o problema para enviar uma notificação push ao admin e
              gerente:
            </p>
            <Textarea
              placeholder="Ex: Perfil de 3m chegou curto, faltam 20cm para concluir o corte..."
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
                variant="ghost"
                onClick={() => setShowAlert(false)}
                disabled={alertPending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
