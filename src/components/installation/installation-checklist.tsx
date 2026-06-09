"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Hammer,
  GlassWater,
  BadgeCheck,
  ImageOff,
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
import { updateItemInstallationStepAction } from "@/actions/installation-step-actions";
import { StageProblemReport } from "@/components/workflow/stage-problem-report";
import { DrawingPreview } from "@/components/production/drawing-preview";
import { MeasurementDimensionsSummary } from "@/components/field/measurement-item-view";
import type { MeasurementLineItem, InstallationDailyNote } from "@/lib/workflow/schemas";
import { formatDimensionsSummary } from "@/lib/measurement/dimensions";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import { InstallationDailyNotes } from "@/components/installation/installation-daily-notes";

type InstStep = "estrutural" | "vidros";

const INST_STEPS: {
  key: InstStep;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}[] = [
  { key: "estrutural", label: "Estrutural", shortLabel: "Estr.", icon: Hammer },
  { key: "vidros", label: "Vidros", shortLabel: "Vidr.", icon: GlassWater },
];

type ItemInstProgress = Record<InstStep, boolean>;

function getItemInstProgress(item: MeasurementLineItem): ItemInstProgress {
  return {
    estrutural: item.installationProgress?.estrutural ?? false,
    vidros: item.installationProgress?.vidros ?? false,
  };
}

function getItemInstGates(
  item: MeasurementLineItem,
  isLatePhase: boolean,
): Record<InstStep, { unlocked: boolean; reason: string | null }> {
  const cut = item.cuttingProgress ?? { corte: false, embalagem: false, acessorios: false, vidros: false };
  const trans = item.transportProgress ?? { perfilEstrutural: false, perfilTotal: false, acessorios: false, vidros: false };

  const estruturalOk = cut.corte || isLatePhase;
  const vidrosOk = cut.vidros || trans.vidros || cut.acessorios || trans.acessorios || isLatePhase;

  return {
    estrutural: {
      unlocked: estruturalOk,
      reason: estruturalOk ? null : "Aguardando corte deste vão",
    },
    vidros: {
      unlocked: vidrosOk,
      reason: vidrosOk ? null : "Aguardando vidros ou acessórios deste vão",
    },
  };
}

function buildItemLabel(
  item: MeasurementLineItem,
  index: number,
  lookups?: MeasurementLookups,
): string {
  const ambiente = resolveLookupLabel(lookups?.ambientes ?? [], item.idAmbiente ?? null);
  const dims = formatDimensionsSummary(item);
  if (ambiente && dims) return `${ambiente} — ${dims}`;
  if (ambiente) return ambiente;
  if (dims) return dims;
  return `Vão ${index + 1}`;
}

/** Painel inline de mídia de um vão — desenhos e fotos */
function VaoMediaPanel({
  item,
  index,
  lookups,
}: {
  item: MeasurementLineItem;
  index: number;
  lookups?: MeasurementLookups;
}) {
  const allDrawings =
    item.drawings && item.drawings.length > 0
      ? item.drawings
      : item.drawingUrl
        ? [{ id: "__legacy__", url: item.drawingUrl }]
        : [];

  const photos = item.photos ?? [];
  const hasMedia = allDrawings.length > 0 || photos.length > 0;

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {/* Dimensões e especificações */}
      <MeasurementDimensionsSummary
        item={item}
        lookups={lookups}
        variant="inline"
      />

      {/* Desenhos */}
      {allDrawings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {allDrawings.length === 1 ? "Desenho" : `Desenhos (${allDrawings.length})`}
          </p>
          <div
            className={cn(
              "grid gap-2",
              allDrawings.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {allDrawings.map((d, dIdx) => (
              <div key={d.id} className="overflow-hidden rounded-lg border bg-muted/30">
                <DrawingPreview
                  src={d.url}
                  alt={`Desenho ${dIdx + 1} — Vão ${index + 1}`}
                  variant="thumbnail"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fotos */}
      {photos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {photos.length === 1 ? "Foto" : `Fotos (${photos.length})`}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((url, pIdx) => (
              <div key={url} className="overflow-hidden rounded-lg border bg-muted/30">
                <DrawingPreview
                  src={url}
                  alt={`Foto ${pIdx + 1} — Vão ${index + 1}`}
                  variant="thumbnail"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sem mídia */}
      {!hasMedia && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <ImageOff className="h-3.5 w-3.5 shrink-0" />
          Nenhum desenho ou foto registrado neste vão.
        </div>
      )}

      {/* Observação */}
      {item.observacao && (
        <p className="text-[12px] italic text-muted-foreground">
          <span className="not-italic font-medium">Obs:</span> {item.observacao}
        </p>
      )}
    </div>
  );
}

type Props = {
  osId: string;
  osStatus: string;
  items: MeasurementLineItem[];
  dailyNotes?: InstallationDailyNote[];
  lookups?: MeasurementLookups;
};

export function InstallationChecklist({
  osId,
  osStatus,
  items,
  dailyNotes = [],
  lookups,
}: Props) {
  const isLatePhase =
    osStatus.startsWith("instalacao") || osStatus === "concluido";

  const [progress, setProgress] = useState<Record<string, ItemInstProgress>>(
    () =>
      Object.fromEntries(items.map((item) => [item.id, getItemInstProgress(item)])),
  );
  const [expandedId, setExpandedId] = useState<string | null>(
    // Abre o primeiro vão por padrão
    items.length > 0 ? items[0]!.id : null,
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const allEstrutural = items.length > 0 && items.every((i) => progress[i.id]?.estrutural);
  const allVidros = items.length > 0 && items.every((i) => progress[i.id]?.vidros);
  const allDone = allEstrutural && allVidros;

  function toggleExpand(itemId: string) {
    setExpandedId((prev) => (prev === itemId ? null : itemId));
  }

  async function handleToggle(itemId: string, step: InstStep, done: boolean) {
    const key = `${itemId}-${step}`;
    setLoadingKey(key);
    setStepError(null);

    let result: Awaited<ReturnType<typeof updateItemInstallationStepAction>> | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await updateItemInstallationStepAction({ osId, itemId, step, done });
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
            <Hammer className="h-4 w-4 text-success" />
            Instalação por vão
          </span>
          {/* Barra de progresso */}
          <div className="flex items-center gap-1.5">
            {INST_STEPS.map(({ key, shortLabel }) => {
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
                          ? "bg-success/40"
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
        <StageProblemReport osId={osId} stage="installation" />

        {stepError && (
          <Alert variant="destructive">
            <AlertDescription>{stepError}</AlertDescription>
          </Alert>
        )}

        {/* Lista de vãos */}
        <div className="space-y-2">
          {items.map((item, index) => {
            const itemProgress = progress[item.id] ?? { estrutural: false, vidros: false };
            const gates = getItemInstGates(item, isLatePhase);
            const doneSteps = INST_STEPS.filter(({ key }) => itemProgress[key]).length;
            const itemAllDone = doneSteps === 2;
            const label = buildItemLabel(item, index, lookups);
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  itemAllDone
                    ? "border-success-border bg-success-muted"
                    : "border-border bg-card",
                )}
              >
                {/* Cabeçalho do vão */}
                <div className="flex w-full items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={isExpanded}
                  >
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        itemAllDone ? "text-success-foreground" : "text-foreground",
                      )}
                    >
                      Vão {index + 1}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={label}>
                      {label}
                    </p>
                  </button>

                  {/* Checkboxes inline (desktop) */}
                  <div className="hidden items-center gap-3 sm:flex">
                    {INST_STEPS.map(({ key, shortLabel }) => {
                      const done = itemProgress[key];
                      const gate = gates[key];
                      const lKey = `${item.id}-${key}`;
                      const isLoading = loadingKey === lKey;
                      const isLocked = !gate.unlocked && !done;

                      return (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="text-[11px] text-muted-foreground">{shortLabel}</span>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : isLocked ? (
                            <span title={gate.reason ?? undefined}>
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </span>
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

                  {/* Badge de progresso (mobile) */}
                  <div className="flex items-center gap-2 sm:hidden">
                    {itemAllDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[11px]">
                        {doneSteps}/2
                      </Badge>
                    )}
                  </div>

                  <button
                    type="button"
                    className="ml-1 shrink-0 text-muted-foreground"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Recolher" : "Expandir"} vão ${index + 1}`}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Checkboxes mobile (fora do header, sempre visíveis) */}
                <div className="grid grid-cols-2 gap-1.5 px-3 pb-2.5 sm:hidden">
                  {INST_STEPS.map(({ key, label: stepLabel, icon: Icon }) => {
                    const done = itemProgress[key];
                    const gate = gates[key];
                    const lKey = `${item.id}-${key}`;
                    const isLoading = loadingKey === lKey;
                    const isLocked = !gate.unlocked && !done;

                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 transition-colors",
                          done
                            ? "border-success-border bg-success-muted"
                            : isLocked
                              ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                              : "border-border bg-background hover:bg-muted/50",
                          isLoading && "opacity-60",
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground/50" />
                        ) : done ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Icon className="h-4 w-4 text-success/70" />
                        )}
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block text-xs font-semibold leading-tight",
                              done
                                ? "text-success-foreground"
                                : isLocked
                                  ? "text-muted-foreground/60"
                                  : "text-foreground",
                            )}
                          >
                            {stepLabel}
                          </span>
                          {isLocked && (
                            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/60">
                              {gate.reason}
                            </p>
                          )}
                        </div>
                        {!isLocked && !isLoading && (
                          <Checkbox
                            checked={done}
                            disabled={isLoading}
                            onCheckedChange={(v) =>
                              handleToggle(item.id, key, v === true)
                            }
                            className={cn(
                              "ml-auto shrink-0",
                              done && "border-success bg-success",
                            )}
                            aria-label={`${stepLabel} — Vão ${index + 1}`}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* Painel de mídia expansível */}
                {isExpanded && (
                  <div className="px-3 pb-3">
                    <VaoMediaPanel item={item} index={index} lookups={lookups} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <InstallationDailyNotes osId={osId} initialNotes={dailyNotes} />

        {/* Banner: instalação concluída */}
        {allDone && (
          <Alert variant="success">
            <BadgeCheck className="h-4 w-4" />
            <AlertDescription>
              Instalação concluída! Todos os vãos foram instalados.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
