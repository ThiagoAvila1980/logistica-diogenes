"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Lock,
  Truck,
  BadgeCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { updateItemTransportStepAction } from "@/actions/transport-actions";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { formatDimensionsSummary } from "@/lib/measurement/dimensions";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";

type TransportStep = "perfilEstrutural" | "perfilTotal" | "acessorios" | "vidros";

const TRANSPORT_STEPS: { key: TransportStep; label: string; shortLabel: string }[] = [
  { key: "perfilEstrutural", label: "Perf. Est.", shortLabel: "P.Est." },
  { key: "perfilTotal", label: "Perf. Total", shortLabel: "P.Tot." },
  { key: "acessorios", label: "Acessórios", shortLabel: "Acess." },
  { key: "vidros", label: "Vidros", shortLabel: "Vidr." },
];

type ItemTransportProgress = Record<TransportStep, boolean>;

function getItemTransportProgress(item: MeasurementLineItem): ItemTransportProgress {
  return {
    perfilEstrutural: item.transportProgress?.perfilEstrutural ?? false,
    perfilTotal: item.transportProgress?.perfilTotal ?? false,
    acessorios: item.transportProgress?.acessorios ?? false,
    vidros: item.transportProgress?.vidros ?? false,
  };
}

/**
 * Retorna quais etapas de transporte estão desbloqueadas para um vão,
 * baseado no progresso de corte daquele vão e na fase atual da OS.
 */
function getItemTransportGates(
  item: MeasurementLineItem,
  hasVehicle: boolean,
  isLatePhase: boolean,
): Record<TransportStep, { unlocked: boolean; reason: string | null }> {
  const cut = item.cuttingProgress ?? {
    corte: false, embalagem: false, acessorios: false, vidros: false,
  };

  const corteOk = cut.corte || isLatePhase;
  const embalagemOk = cut.embalagem || isLatePhase;
  const acessoriosOk = cut.acessorios || isLatePhase;
  const vidrosOk = cut.vidros || isLatePhase;

  return {
    perfilEstrutural: {
      unlocked: corteOk && hasVehicle,
      reason: !corteOk
        ? "Aguardando corte deste vão"
        : !hasVehicle
          ? "Selecione um veículo primeiro"
          : null,
    },
    perfilTotal: {
      unlocked: embalagemOk,
      reason: embalagemOk ? null : "Aguardando embalagem deste vão",
    },
    acessorios: {
      unlocked: acessoriosOk,
      reason: acessoriosOk ? null : "Aguardando acessórios deste vão",
    },
    vidros: {
      unlocked: vidrosOk,
      reason: vidrosOk ? null : "Aguardando vidros deste vão",
    },
  };
}

function buildItemLabel(
  item: MeasurementLineItem,
  index: number,
  lookups?: MeasurementLookups,
): string {
  const ambiente = resolveLookupLabel(
    lookups?.ambientes ?? [],
    item.idAmbiente ?? null,
  );
  const dims = formatDimensionsSummary(item);
  if (ambiente && dims) return `${ambiente} — ${dims}`;
  if (ambiente) return ambiente;
  if (dims) return dims;
  return `Vão ${index + 1}`;
}

type Props = {
  osId: string;
  osStatus: string;
  items: MeasurementLineItem[];
  vehicleId: string | null;
  lookups?: MeasurementLookups;
};

export function TransportChecklist({
  osId,
  osStatus,
  items,
  vehicleId,
  lookups,
}: Props) {
  const isLatePhase =
    osStatus.startsWith("instalacao") || osStatus === "concluido";

  const [progress, setProgress] = useState<Record<string, ItemTransportProgress>>(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, getItemTransportProgress(item)]),
      ),
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Progresso agregado para o banner de status
  const anyPerfilEst = items.some((i) => progress[i.id]?.perfilEstrutural);
  const allPerfilTot = items.length > 0 && items.every((i) => progress[i.id]?.perfilTotal);
  const allAcessorios = items.length > 0 && items.every((i) => progress[i.id]?.acessorios);
  const allVidros = items.length > 0 && items.every((i) => progress[i.id]?.vidros);
  const allDone = anyPerfilEst && allPerfilTot && allAcessorios && allVidros;

  async function handleToggle(itemId: string, step: TransportStep, done: boolean) {
    const key = `${itemId}-${step}`;
    setLoadingKey(key);
    setStepError(null);

    let result: Awaited<ReturnType<typeof updateItemTransportStepAction>> | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await updateItemTransportStepAction({ osId, itemId, step, done });
        break;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }

    if (!result) {
      setStepError("Falha de conexão. Verifique sua internet e tente novamente.");
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
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Transporte por vão
          </span>
          {/* Barra de progresso por etapa */}
          <div className="flex items-center gap-1.5">
            {TRANSPORT_STEPS.map(({ key, shortLabel }) => {
              const doneCount = items.filter((i) => progress[i.id]?.[key]).length;
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
        {stepError && (
          <Alert variant="destructive">
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        {/* Cabeçalho das colunas (desktop) */}
        <div className="hidden grid-cols-[1fr_repeat(4,56px)] gap-2 px-3 sm:grid">
          <span />
          {TRANSPORT_STEPS.map(({ key, label }) => (
            <span
              key={key}
              className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Lista de vãos */}
        <div className="space-y-2">
          {items.map((item, index) => {
            const itemProgress = progress[item.id] ?? {
              perfilEstrutural: false,
              perfilTotal: false,
              acessorios: false,
              vidros: false,
            };
            const gates = getItemTransportGates(item, Boolean(vehicleId), isLatePhase);
            const doneSteps = TRANSPORT_STEPS.filter(({ key }) => itemProgress[key]).length;
            const itemAllDone = doneSteps === 4;
            const label = buildItemLabel(item, index, lookups);

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 transition-colors",
                  itemAllDone
                    ? "border-success-border bg-success-muted"
                    : "border-border bg-card",
                )}
              >
                {/* Desktop: grid com 4 colunas de checkboxes */}
                <div className="hidden items-center gap-2 sm:grid sm:grid-cols-[1fr_repeat(4,56px)]">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        itemAllDone ? "text-success-foreground" : "text-foreground",
                      )}
                    >
                      Vão {index + 1}
                    </p>
                    <p
                      className="mt-0.5 truncate text-[11px] text-muted-foreground"
                      title={label}
                    >
                      {label}
                    </p>
                  </div>

                  {TRANSPORT_STEPS.map(({ key }) => {
                    const done = itemProgress[key];
                    const gate = gates[key];
                    const lKey = `${item.id}-${key}`;
                    const isLoading = loadingKey === lKey;
                    const isLocked = !gate.unlocked;

                    return (
                      <div key={key} className="flex justify-center">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isLocked && !done ? (
                          <span title={gate.reason ?? undefined}>
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                          </span>
                        ) : (
                          <Checkbox
                            checked={done}
                            disabled={isLoading || (isLocked && !done)}
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

                {/* Mobile: label + 4 botões */}
                <div className="sm:hidden">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-xs font-semibold leading-tight",
                          itemAllDone ? "text-success-foreground" : "text-foreground",
                        )}
                      >
                        Vão {index + 1}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {label}
                      </p>
                    </div>
                    {itemAllDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[11px]">
                        {doneSteps}/4
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {TRANSPORT_STEPS.map(({ key, label: stepLabel }) => {
                      const done = itemProgress[key];
                      const gate = gates[key];
                      const lKey = `${item.id}-${key}`;
                      const isLoading = loadingKey === lKey;
                      const isLocked = !gate.unlocked && !done;

                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex cursor-pointer flex-col items-center gap-1 rounded-md border px-1 py-2 text-center transition-colors",
                            done
                              ? "border-success-border bg-success-muted"
                              : isLocked
                                ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                                : "border-border bg-background hover:bg-muted/50",
                            isLoading && "opacity-60",
                          )}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          ) : isLocked ? (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
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
                              "text-[10px] font-medium leading-tight",
                              done
                                ? "text-success-foreground"
                                : isLocked
                                  ? "text-muted-foreground/60"
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

        {/* Banner: transporte total concluído */}
        {allDone && (
          <Alert variant="success">
            <BadgeCheck className="h-4 w-4" />
            <AlertDescription>
              Transporte concluído! Todos os vãos foram entregues.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
