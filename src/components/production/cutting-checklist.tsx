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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  updateItemCuttingStepAction,
  advanceCuttingToTransportAction,
} from "@/actions/cutting-actions";
import { StageProblemReport } from "@/components/workflow/stage-problem-report";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import {
  buildVaoItemSubtitle,
  formatVaoItemFullLabel,
} from "@/lib/measurement/vao-item-subtitle";

type Step = "corte" | "embalagem" | "acessorios" | "vidros";

const STEPS: { key: Step; label: string; shortLabel: string }[] = [
  { key: "corte", label: "Corte", shortLabel: "Corte" },
  { key: "embalagem", label: "Embalagem", shortLabel: "Embal." },
  { key: "acessorios", label: "Acessórios", shortLabel: "Acess." },
  { key: "vidros", label: "Vidros", shortLabel: "Vidros" },
];

type ItemProgress = Record<Step, boolean>;

function getItemProgress(item: MeasurementLineItem): ItemProgress {
  return {
    corte: item.cuttingProgress?.corte ?? false,
    embalagem: item.cuttingProgress?.embalagem ?? false,
    acessorios: item.cuttingProgress?.acessorios ?? false,
    vidros: item.cuttingProgress?.vidros ?? false,
  };
}

type Props = {
  osId: string;
  osStatus: string;
  items: MeasurementLineItem[];
  lookups?: MeasurementLookups;
  selectedItemId?: string | null;
  onItemSelect?: (itemId: string) => void;
};

export function CuttingChecklist({ osId, osStatus, items, lookups, selectedItemId, onItemSelect }: Props) {
  const router = useRouter();

  const [progress, setProgress] = useState<Record<string, ItemProgress>>(
    () =>
      Object.fromEntries(items.map((item) => [item.id, getItemProgress(item)])),
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isAdvancing, startAdvancing] = useTransition();

  // Progresso agregado
  const anyCorte = items.some((item) => progress[item.id]?.corte);
  const allEmbalagem =
    items.length > 0 && items.every((item) => progress[item.id]?.embalagem);
  const allAcessorios =
    items.length > 0 && items.every((item) => progress[item.id]?.acessorios);
  const allVidros =
    items.length > 0 && items.every((item) => progress[item.id]?.vidros);
  const allDone = anyCorte && allEmbalagem && allAcessorios && allVidros;

  const corteDoneCount = items.filter((item) => progress[item.id]?.corte).length;

  async function handleAdvanceToTransport() {
    startAdvancing(async () => {
      if (
        osStatus.startsWith("transporte_") ||
        osStatus.startsWith("instalacao")
      ) {
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

  async function handleToggle(itemId: string, step: Step, done: boolean) {
    const key = `${itemId}-${step}`;
    setLoadingKey(key);
    setStepError(null);

    let result: Awaited<ReturnType<typeof updateItemCuttingStepAction>> | null =
      null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await updateItemCuttingStepAction({ osId, itemId, step, done });
        break;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!result) {
      setStepError(
        "Falha de conexão. Verifique sua internet e tente novamente.",
      );
    } else if (result.success) {
      setProgress((prev) => ({
        ...prev,
        [itemId]: { ...prev[itemId], [step]: done },
      }));
    } else {
      setStepError(result.message);
    }
    setLoadingKey(null);
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhum vão registrado nesta medição.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>Etapas do corte por vão</span>
          {/* Barra de progresso por etapa */}
          <div className="flex items-center gap-1.5">
            {STEPS.map(({ key, shortLabel }) => {
              const doneCount = items.filter(
                (item) => progress[item.id]?.[key],
              ).length;
              const isAll = doneCount === items.length;
              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-0.5"
                  title={`${shortLabel}: ${doneCount}/${items.length}`}
                >
                  <div
                    className={cn(
                      "h-1.5 w-10 rounded-full transition-colors",
                      isAll
                        ? "bg-success"
                        : doneCount > 0
                          ? "bg-primary/40"
                          : "bg-muted",
                    )}
                  />
                </div>
              );
            })}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <StageProblemReport osId={osId} stage="cutting" />

        {stepError && (
          <Alert variant="destructive">
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        {/* Cabeçalho das colunas (desktop) */}
        <div className="hidden grid-cols-[1fr_repeat(4,56px)] gap-2 px-3 sm:grid">
          <span />
          {STEPS.map(({ key, shortLabel }) => (
            <span
              key={key}
              className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {shortLabel}
            </span>
          ))}
        </div>

        {/* Lista de vãos */}
        <div className="space-y-2">
          {items.map((item, index) => {
            const itemProgress = progress[item.id] ?? {
              corte: false,
              embalagem: false,
              acessorios: false,
              vidros: false,
            };
            const doneSteps = STEPS.filter(({ key }) => itemProgress[key]).length;
            const itemAllDone = doneSteps === 4;
            const subtitle = buildVaoItemSubtitle(item, index, lookups);
            const fullLabel = formatVaoItemFullLabel(subtitle);
            const isSelected = selectedItemId === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 transition-colors",
                  itemAllDone
                    ? "border-success-border bg-success-muted"
                    : "border-border bg-card",
                  isSelected && !itemAllDone && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
                  onItemSelect && "cursor-pointer",
                )}
                onClick={() => onItemSelect?.(item.id)}
              >
                {/* Linha desktop: label + 4 checkboxes em colunas */}
                <div className="hidden items-center gap-2 sm:grid sm:grid-cols-[1fr_repeat(4,56px)]">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        itemAllDone
                          ? "text-success-foreground"
                          : "text-foreground",
                      )}
                    >
                      Vão {index + 1}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs text-muted-foreground"
                      title={fullLabel}
                    >
                      {subtitle.spec}
                    </p>
                    {subtitle.dims ? (
                      <p
                        className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums"
                        title={subtitle.dims}
                      >
                        {subtitle.dims}
                      </p>
                    ) : null}
                  </div>

                  {STEPS.map(({ key }) => {
                    const done = itemProgress[key];
                    const lKey = `${item.id}-${key}`;
                    const isLoading = loadingKey === lKey;
                    return (
                      <div key={key} className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Checkbox
                            checked={done}
                            disabled={isLoading}
                            onCheckedChange={(v) =>
                              handleToggle(item.id, key, v === true)
                            }
                            className={cn(
                              "shrink-0",
                              done && "border-success bg-success",
                            )}
                            aria-label={`${key} — Vão ${index + 1}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Layout mobile: label no topo + checkboxes em linha */}
                <div className="sm:hidden">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-xs font-semibold leading-tight",
                          itemAllDone
                            ? "text-success-foreground"
                            : "text-foreground",
                        )}
                      >
                        Vão {index + 1}
                      </p>
                      <p
                        className="mt-0.5 truncate text-xs text-muted-foreground"
                        title={fullLabel}
                      >
                        {subtitle.spec}
                      </p>
                      {subtitle.dims ? (
                        <p
                          className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums"
                          title={subtitle.dims}
                        >
                          {subtitle.dims}
                        </p>
                      ) : null}
                    </div>
                    {itemAllDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {doneSteps}/4
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {STEPS.map(({ key, label: stepLabel }) => {
                      const done = itemProgress[key];
                      const lKey = `${item.id}-${key}`;
                      const isLoading = loadingKey === lKey;
                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex cursor-pointer flex-col items-center gap-1 rounded-md border px-1 py-2 text-center transition-colors",
                            done
                              ? "border-success-border bg-success-muted"
                              : "border-border bg-background hover:bg-muted/50",
                            isLoading && "opacity-60",
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : (
                            <Checkbox
                              checked={done}
                              disabled={isLoading}
                              onCheckedChange={(v) =>
                                handleToggle(item.id, key, v === true)
                              }
                              className={cn(
                                "shrink-0",
                                done && "border-success bg-success",
                              )}
                              aria-label={`${stepLabel} — Vão ${index + 1}`}
                            />
                          )}
                          <span
                            className={cn(
                              "text-[11px] font-medium leading-tight",
                              done
                                ? "text-success-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {stepLabel}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerta: transporte liberado (corte de algum vão feito, mas não tudo) */}
        {!allDone && anyCorte && (
          <Alert>
            <Truck className="h-4 w-4" />
            <AlertDescription>
              Transporte de perfis liberado —{" "}
              {corteDoneCount === 1
                ? "1 vão com corte concluído."
                : `${corteDoneCount} vãos com corte concluído.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta: tudo pronto */}
        {allDone && (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>Todos os vãos concluídos!</span>
              <Button
                size="sm"
                onClick={handleAdvanceToTransport}
                disabled={isAdvancing}
                className="shrink-0 bg-success text-primary-foreground hover:bg-success/90"
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
