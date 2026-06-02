"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { updateCuttingStepAction, advanceCuttingToTransportAction } from "@/actions/cutting-actions";
import { StageProblemReport } from "@/components/workflow/stage-problem-report";

type Step = "corte" | "embalagem" | "acessorios";

type Props = {
  osId: string;
  osStatus: string;
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

export function CuttingChecklist({ osId, osStatus, initialSteps }: Props) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [loadingStep, setLoadingStep] = useState<Step | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isAdvancing, startAdvancing] = useTransition();

  const allDone = steps.corte && steps.embalagem && steps.acessorios;

  async function handleAdvanceToTransport() {
    startAdvancing(async () => {
      if (osStatus.startsWith("transporte_") || osStatus.startsWith("instalacao")) {
        router.push(`/logistics/${osId}`);
        return;
      }

      const result = await advanceCuttingToTransportAction({ osId });
      if (result.success) {
        router.push(`/logistics/${osId}`);
      } else {
        setStepError(result.message ?? "Erro ao avançar para transporte");
      }
    });
  }

  async function handleStepToggle(step: Step, done: boolean) {
    setLoadingStep(step);
    setStepError(null);

    let result: Awaited<ReturnType<typeof updateCuttingStepAction>> | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await updateCuttingStepAction({ osId, step, done });
        break;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!result) {
      setStepError("Falha de conexão. Verifique sua internet e tente novamente.");
    } else if (result.success) {
      setSteps((prev) => ({ ...prev, [step]: done }));
    } else {
      setStepError(result.message);
    }
    setLoadingStep(null);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Etapas do corte</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <StageProblemReport osId={osId} stage="cutting" />
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

        {allDone && (
          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="flex items-center justify-between gap-3 text-emerald-700 dark:text-emerald-400">
              <span>Todas as etapas de corte concluídas.</span>
              <Button
                size="sm"
                onClick={handleAdvanceToTransport}
                disabled={isAdvancing}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isAdvancing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Truck className="mr-1.5 h-3.5 w-3.5" />
                )}
                Ver transporte
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
