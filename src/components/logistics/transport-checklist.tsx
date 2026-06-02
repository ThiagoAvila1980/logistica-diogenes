"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Truck,
  Package,
  Wrench,
  Layers,
  BadgeCheck,
  PanelTop,
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
import { updateTransportStepAction } from "@/actions/transport-actions";
import {
  getTransportGates,
  type TransportSteps,
  type CuttingSteps,
  type TransportChecklistStep,
} from "@/lib/transport-gates";

type Step = TransportChecklistStep;

type StepConfig = {
  key: Step;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  color: {
    unlocked: string;
    done: string;
    locked: string;
    badge: string;
    badgeDone: string;
    icon: string;
  };
};

const STEPS: StepConfig[] = [
  {
    key: "levarPerfilEstrutural",
    label: "Levar Perfil Estrutural",
    shortLabel: "Perfil Est.",
    description: "Perfil estrutural carregado e entregue na obra",
    icon: Truck,
    color: {
      unlocked: "border-accent bg-accent/50",
      done: "border-success-border bg-success-muted",
      locked: "border-border bg-muted/30",
      badge: "bg-accent text-accent-foreground",
      badgeDone: "bg-success-subtle text-success-foreground",
      icon: "text-primary",
    },
  },
  {
    key: "levarPerfilTotal",
    label: "Levar Perfis Total",
    shortLabel: "Perfis Tot.",
    description: "Todos os perfis embalados e entregues na obra",
    icon: Layers,
    color: {
      unlocked: "border-info-border bg-info-muted",
      done: "border-success-border bg-success-muted",
      locked: "border-border bg-muted/30",
      badge: "bg-info-muted text-info-foreground",
      badgeDone: "bg-success-subtle text-success-foreground",
      icon: "text-info",
    },
  },
  {
    key: "levarAcessorios",
    label: "Levar Acessórios",
    shortLabel: "Acessórios",
    description: "Dobradiças, parafusos e demais acessórios entregues",
    icon: Package,
    color: {
      unlocked: "border-primary/20 bg-accent",
      done: "border-success-border bg-success-muted",
      locked: "border-border bg-muted/30",
      badge: "bg-accent text-primary",
      badgeDone: "bg-success-subtle text-success-foreground",
      icon: "text-primary",
    },
  },
  {
    key: "levarVidros",
    label: "Levar Vidros",
    shortLabel: "Vidros",
    description: "Vidros carregados e entregues na obra",
    icon: PanelTop,
    color: {
      unlocked: "border-info-border bg-info-muted/80",
      done: "border-success-border bg-success-muted",
      locked: "border-border bg-muted/30",
      badge: "bg-info-muted text-info-foreground",
      badgeDone: "bg-success-subtle text-success-foreground",
      icon: "text-info",
    },
  },
  {
    key: "transporteConcluido",
    label: "Transporte Total Concluído",
    shortLabel: "Concluído",
    description: "Todas as entregas realizadas — transporte finalizado",
    icon: BadgeCheck,
    color: {
      unlocked: "border-success-border bg-success-muted",
      done: "border-success-border bg-success-subtle",
      locked: "border-border bg-muted/30",
      badge: "bg-success-subtle text-success-foreground",
      badgeDone: "bg-success-subtle text-success-foreground",
      icon: "text-success",
    },
  },
];

type Props = {
  osId: string;
  initialTransportSteps: TransportSteps;
  initialCuttingSteps: CuttingSteps;
  vehicleId: string | null;
};

export function TransportChecklist({
  osId,
  initialTransportSteps,
  initialCuttingSteps,
  vehicleId,
}: Props) {
  const [steps, setSteps] = useState<TransportSteps>(initialTransportSteps);
  const [cuttingSteps] = useState<CuttingSteps>(initialCuttingSteps);
  const [loadingStep, setLoadingStep] = useState<Step | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const gates = getTransportGates(cuttingSteps, steps, {
    hasVehicle: Boolean(vehicleId),
  });
  const allDone = steps.transporteConcluido;

  async function handleToggle(step: Step, done: boolean) {
    setLoadingStep(step);
    setStepError(null);

    let result: Awaited<ReturnType<typeof updateTransportStepAction>> | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await updateTransportStepAction({ osId, step, done });
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
          <Truck className="h-4 w-4 text-primary" />
          Etapas de Transporte
        </CardTitle>

        {/* Mini barra de progresso */}
        <div className="flex gap-1.5 pt-1">
          {STEPS.filter((s) => s.key !== "transporteConcluido").map((s) => {
            const done = steps[s.key];
            const gate = gates[s.key];
            return (
              <div key={s.key} className="flex flex-col items-center gap-0.5">
                <div
                  title={s.shortLabel}
                  className={cn(
                    "h-1.5 w-8 rounded-full transition-colors",
                    done
                      ? "bg-success"
                      : gate.unlocked
                        ? "bg-primary/30"
                        : "bg-muted",
                  )}
                />
              </div>
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
          const { key, label, description, icon: Icon, color } = config;
          const done = steps[key];
          const gate = gates[key];
          const isLoading = loadingStep === key;
          const isLocked = !gate.unlocked;

          return (
            <label
              key={key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-all duration-150",
                done ? color.done : isLocked ? color.locked : color.unlocked,
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
                        ? "text-success-foreground"
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
                      Entregue
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
                  {isLocked
                    ? gate.lockedReason
                    : description}
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
                      "border-success bg-success",
                  )}
                />
              )}
            </label>
          );
        })}

        {allDone && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Transporte concluído! O instalador pode seguir com os vidros quando liberado.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
