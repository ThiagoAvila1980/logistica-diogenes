"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Wrench,
  GlassWater,
  BadgeCheck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateInstallationStepAction } from "@/actions/installation-step-actions";
import {
  getInstallationGates,
  type InstallationSteps,
  type TransportSteps,
  type CuttingSteps,
} from "@/lib/transport-gates";

type Step = keyof InstallationSteps;

type StepConfig = {
  key: Step;
  gateKey: "instalacaoEstrutural" | "instalacaoVidros";
  label: string;
  description: string;
  icon: React.ElementType;
  color: {
    unlocked: string;
    done: string;
    icon: string;
    badge: string;
    badgeDone: string;
  };
};

const STEPS: StepConfig[] = [
  {
    key: "instalacaoEstruturalFeita",
    gateKey: "instalacaoEstrutural",
    label: "Instalação Estrutural",
    description: "Perfil estrutural instalado e fixado na obra",
    icon: Wrench,
    color: {
      unlocked:
        "border-lime-200 bg-lime-50 dark:border-lime-800 dark:bg-lime-900/20",
      done: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20",
      icon: "text-lime-600 dark:text-lime-400",
      badge:
        "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
      badgeDone:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
  },
  {
    key: "instalacaoVidrosFeita",
    gateKey: "instalacaoVidros",
    label: "Instalação dos Vidros",
    description: "Vidros encaixados, vedados e conferidos",
    icon: GlassWater,
    color: {
      unlocked:
        "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20",
      done: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20",
      icon: "text-green-600 dark:text-green-400",
      badge:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      badgeDone:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
  },
];

type Props = {
  osId: string;
  initialInstallationSteps: InstallationSteps;
  initialTransportSteps: TransportSteps;
  initialCuttingSteps: CuttingSteps;
};

export function InstallationChecklist({
  osId,
  initialInstallationSteps,
  initialTransportSteps,
  initialCuttingSteps,
}: Props) {
  const [steps, setSteps] = useState<InstallationSteps>(
    initialInstallationSteps,
  );
  const [loadingStep, setLoadingStep] = useState<Step | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const gates = getInstallationGates(initialTransportSteps, initialCuttingSteps);
  const allDone =
    steps.instalacaoEstruturalFeita && steps.instalacaoVidrosFeita;

  async function handleToggle(step: Step, done: boolean) {
    setLoadingStep(step);
    setStepError(null);

    let result: Awaited<ReturnType<typeof updateInstallationStepAction>> | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await updateInstallationStepAction({ osId, step, done });
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4 text-lime-600" />
          Etapas de Instalação
        </CardTitle>

        {/* Mini barra de progresso */}
        <div className="flex gap-1.5 pt-1">
          {STEPS.map((s) => {
            const done = steps[s.key];
            const gate = gates[s.gateKey];
            return (
              <div
                key={s.key}
                title={s.label}
                className={cn(
                  "h-1.5 w-10 rounded-full transition-colors",
                  done
                    ? "bg-emerald-500"
                    : gate.unlocked
                      ? "bg-lime-300 dark:bg-lime-700"
                      : "bg-muted",
                )}
              />
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {stepError && (
          <Alert variant="destructive">
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        {STEPS.map((config) => {
          const { key, gateKey, label, description, icon: Icon, color } =
            config;
          const done = steps[key];
          const gate = gates[gateKey];
          const isLoading = loadingStep === key;
          const isLocked = !gate.unlocked;

          return (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-all duration-150",
                done ? color.done : isLocked ? "border-border bg-muted/30" : color.unlocked,
                isLocked && "cursor-not-allowed opacity-70",
                isLoading && "opacity-60",
              )}
            >
              {/* Ícone / estado */}
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background/70">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : isLocked ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : done ? (
                  <CheckCircle2 className={cn("h-4 w-4", color.icon)} />
                ) : (
                  <Icon className={cn("h-4 w-4", color.icon)} />
                )}
              </div>

              {/* Texto */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-semibold leading-tight",
                      done
                        ? "text-emerald-700 dark:text-emerald-400"
                        : isLocked
                          ? "text-muted-foreground"
                          : "text-foreground",
                    )}
                  >
                    {label}
                  </span>
                  {done && (
                    <Badge
                      variant="outline"
                      className={cn("h-4 px-1.5 text-[10px]", color.badgeDone)}
                    >
                      Concluída
                    </Badge>
                  )}
                  {!done && !isLocked && (
                    <Badge
                      variant="outline"
                      className={cn("h-4 px-1.5 text-[10px]", color.badge)}
                    >
                      Disponível
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {isLocked ? gate.lockedReason : description}
                </p>
              </div>

              {/* Checkbox — só mostra quando desbloqueado */}
              {!isLocked && !isLoading && (
                <Checkbox
                  checked={done}
                  disabled={isLoading}
                  onCheckedChange={(v) => handleToggle(key, v === true)}
                  className={cn(
                    "mt-0.5 shrink-0",
                    done &&
                      "border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-600",
                  )}
                />
              )}
            </label>
          );
        })}

        {/* Instalação Total Concluída — calculada automaticamente */}
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border px-3 py-3",
            allDone
              ? "border-emerald-400 bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-900/30"
              : "border-border bg-muted/20 opacity-60",
          )}
        >
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background/70">
            {allDone ? (
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <BadgeCheck className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span
              className={cn(
                "text-sm font-semibold",
                allDone
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              Instalação Total Concluída
            </span>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {allDone
                ? "Todas as etapas concluídas — OS finalizada"
                : "Automático: marcado quando as duas etapas acima forem concluídas"}
            </p>
          </div>
          {allDone && (
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[10px] bg-emerald-200 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
            >
              Concluída
            </Badge>
          )}
        </div>

        {allDone && (
          <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-700 dark:text-emerald-400">
              Instalação concluída! Esta OS está finalizada.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
