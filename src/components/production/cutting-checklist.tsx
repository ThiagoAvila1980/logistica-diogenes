"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { advanceCuttingToTransportAction } from "@/actions/cutting-actions";
import { CuttingStepPhotoButton } from "@/components/production/cutting-step-photo-button";
import { StageProblemReport } from "@/components/workflow/stage-problem-report";
import { PrintVaoLabelButton } from "@/components/production/print-vao-label-button";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import {
  buildVaoItemSubtitle,
  formatVaoItemFullLabel,
  getVaoNumber,
} from "@/lib/measurement/vao-item-subtitle";
import { getStepAuditMeta } from "@/components/audit/step-audit-hint";
import type { StepCompletionMetaMap } from "@/lib/audit/format-step-audit";
import { aggregateCuttingStepsFromItems } from "@/lib/workflow/aggregates";
import {
  applicableCuttingSteps,
  cuttingStepApplies,
  espelhoTipoIdsFromDescricoes,
} from "@/lib/workflow/espelho-vao";

type Step = "corte" | "embalagem" | "acessorios" | "vidros";

const STEPS: { key: Step; label: string; shortLabel: string }[] = [
  { key: "corte", label: "Corte", shortLabel: "Corte" },
  { key: "embalagem", label: "Embalagem", shortLabel: "Embal." },
  { key: "acessorios", label: "Acessórios", shortLabel: "Acess." },
  { key: "vidros", label: "Vidros", shortLabel: "Vidros" },
];

type ItemProgress = Record<Step, boolean>;
type ItemPhotos = Partial<Record<Step, string>>;

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
  /** Só preenchido para admin — metadados do último step_checked */
  stepAuditMeta?: StepCompletionMetaMap;
};

export function CuttingChecklist({
  osId,
  osStatus,
  items,
  lookups,
  selectedItemId,
  onItemSelect,
  stepAuditMeta,
}: Props) {
  const router = useRouter();

  const [progress, setProgress] = useState<Record<string, ItemProgress>>(
    () =>
      Object.fromEntries(items.map((item) => [item.id, getItemProgress(item)])),
  );
  const [photos, setPhotos] = useState<Record<string, ItemPhotos>>(() =>
    Object.fromEntries(
      items.map((item) => [item.id, item.cuttingStepPhotos ?? {}]),
    ),
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [isAdvancing, startAdvancing] = useTransition();

  const espelhoTipoIds = espelhoTipoIdsFromDescricoes(
    lookups?.tipoEnvidracamento ?? [],
  );
  const columnSteps = STEPS.filter((step) =>
    items.some((item) => cuttingStepApplies(item, step.key, espelhoTipoIds)),
  );
  const desktopGrid = {
    gridTemplateColumns: `minmax(0,1fr) repeat(${Math.max(columnSteps.length, 1)}, 56px)`,
  };

  const cuttingAggregate = aggregateCuttingStepsFromItems(
    items.map((item) => ({
      ...item,
      cuttingProgress: progress[item.id] ?? getItemProgress(item),
    })),
    espelhoTipoIds,
  );
  const anyCorte = items.some(
    (item) =>
      cuttingStepApplies(item, "corte", espelhoTipoIds) &&
      progress[item.id]?.corte,
  );
  const allDone =
    cuttingAggregate.corteFeito &&
    cuttingAggregate.embalagemFeita &&
    cuttingAggregate.acessoriosFeitos &&
    cuttingAggregate.vidrosFeitos;

  const corteDoneCount = items.filter(
    (item) =>
      cuttingStepApplies(item, "corte", espelhoTipoIds) &&
      progress[item.id]?.corte,
  ).length;

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

  function handleStepCompleted(itemId: string, step: Step, photoUrl: string) {
    setProgress((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId]!, [step]: true },
    }));
    setPhotos((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [step]: photoUrl },
    }));
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
            {columnSteps.map(({ key, shortLabel }) => {
              const applicable = items.filter((item) =>
                cuttingStepApplies(item, key, espelhoTipoIds),
              );
              const doneCount = applicable.filter(
                (item) => progress[item.id]?.[key],
              ).length;
              const isAll = applicable.length > 0 && doneCount === applicable.length;
              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-0.5"
                  title={`${shortLabel}: ${doneCount}/${applicable.length}`}
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
        <div className="hidden gap-2 px-3 sm:grid" style={desktopGrid}>
          <span />
          {columnSteps.map(({ key, shortLabel }) => (
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
            const itemSteps = applicableCuttingSteps(item, espelhoTipoIds);
            const doneSteps = itemSteps.filter((key) => itemProgress[key]).length;
            const itemAllDone = doneSteps === itemSteps.length;
            const showLabelButton = cuttingStepApplies(item, "embalagem", espelhoTipoIds)
              ? itemProgress.embalagem
              : itemProgress.vidros;
            const subtitle = buildVaoItemSubtitle(item, index, lookups);
            const fullLabel = formatVaoItemFullLabel(subtitle);
            const vaoNumber = getVaoNumber(item, index);
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
                <div className="hidden items-center gap-2 sm:grid" style={desktopGrid}>
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-semibold leading-tight",
                          itemAllDone
                            ? "text-success-foreground"
                            : "text-foreground",
                        )}
                      >
                        Vão {vaoNumber}
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
                    {showLabelButton ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <PrintVaoLabelButton
                          osId={osId}
                          itemId={item.id}
                          vaoNumber={vaoNumber}
                        />
                      </div>
                    ) : null}
                  </div>

                  {columnSteps.map(({ key, label: stepLabel }) => {
                    if (!cuttingStepApplies(item, key, espelhoTipoIds)) {
                      return <div key={key} />;
                    }
                    const done = itemProgress[key];
                    return (
                      <div key={key} className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                        <CuttingStepPhotoButton
                          osId={osId}
                          itemId={item.id}
                          step={key}
                          stepLabel={stepLabel}
                          vaoNumber={vaoNumber}
                          done={done}
                          photoUrl={photos[item.id]?.[key]}
                          auditMeta={
                            done
                              ? getStepAuditMeta(stepAuditMeta, item.id, key)
                              : undefined
                          }
                          onCompleted={(url) =>
                            handleStepCompleted(item.id, key, url)
                          }
                          onError={setStepError}
                        />
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
                        Vão {vaoNumber}
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
                    <div
                      className="flex shrink-0 items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {showLabelButton ? (
                        <PrintVaoLabelButton
                          osId={osId}
                          itemId={item.id}
                          vaoNumber={vaoNumber}
                        />
                      ) : null}
                      {itemAllDone ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {doneSteps}/{itemSteps.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${itemSteps.length}, minmax(0, 1fr))`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {itemSteps.map((key) => {
                      const stepLabel = STEPS.find((step) => step.key === key)?.label ?? key;
                      const done = itemProgress[key];
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-md border px-1 py-2 text-center transition-colors",
                            done
                              ? "border-success-border bg-success-muted"
                              : "border-border bg-background",
                          )}
                        >
                          <CuttingStepPhotoButton
                            osId={osId}
                            itemId={item.id}
                            step={key}
                            stepLabel={stepLabel}
                            vaoNumber={vaoNumber}
                            done={done}
                            photoUrl={photos[item.id]?.[key]}
                            auditMeta={
                              done
                                ? getStepAuditMeta(stepAuditMeta, item.id, key)
                                : undefined
                            }
                            onCompleted={(url) =>
                              handleStepCompleted(item.id, key, url)
                            }
                            onError={setStepError}
                          />
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
                        </div>
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
