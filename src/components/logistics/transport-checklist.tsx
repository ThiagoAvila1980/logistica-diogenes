"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import type { DriverOption } from "@/lib/data/drivers-db";
import {
  buildVaoItemSubtitle,
  formatVaoItemFullLabel,
  getVaoNumber,
} from "@/lib/measurement/vao-item-subtitle";
import { VaoStepDriverSelect } from "@/components/logistics/vao-step-driver-select";
import { TransportVaoNotesField } from "@/components/logistics/transport-vao-notes";
import type { VehicleOptionForSelection } from "@/lib/data/vehicles-db";
import {
  getItemTransportGates,
  type TransportStep,
} from "@/lib/logistics/transport-item-gates";
import { getVaoStepAssignment } from "@/lib/logistics/transport-step-assignment";
import {
  getStepAuditMeta,
  StepAuditLine,
} from "@/components/audit/step-audit-hint";
import type { StepCompletionMetaMap } from "@/lib/audit/format-step-audit";

const TRANSPORT_STEPS: { key: TransportStep; label: string; shortLabel: string }[] = [
  { key: "perfilEstrutural", label: "Perfil estrutural", shortLabel: "Perfil Estrut." },
  { key: "perfilTotal", label: "Perfil total", shortLabel: "Perfil Total" },
  { key: "acessorios", label: "Acessórios", shortLabel: "Acessórios" },
  { key: "vidros", label: "Vidros", shortLabel: "Vidros" },
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

type Props = {
  osId: string;
  osStatus: string;
  items: MeasurementLineItem[];
  vehicles: VehicleOptionForSelection[];
  lookups?: MeasurementLookups;
  drivers?: DriverOption[];
  canAssignDriver?: boolean;
  canAssignVehicle?: boolean;
  /** Só preenchido para admin */
  stepAuditMeta?: StepCompletionMetaMap;
};

export function TransportChecklist({
  osId,
  osStatus,
  items,
  vehicles,
  lookups,
  drivers = [],
  canAssignDriver = false,
  canAssignVehicle = true,
  stepAuditMeta,
}: Props) {
  const [progress, setProgress] = useState<Record<string, ItemTransportProgress>>(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, getItemTransportProgress(item)]),
      ),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  function toggleExpand(itemId: string) {
    setExpandedId((prev) => (prev === itemId ? null : itemId));
  }

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

        {/* Lista de vãos */}
        <div className="space-y-2">
          {items.map((item, index) => {
            const itemProgress = progress[item.id] ?? {
              perfilEstrutural: false,
              perfilTotal: false,
              acessorios: false,
              vidros: false,
            };
            const gates = getItemTransportGates(item, osStatus);
            const doneSteps = TRANSPORT_STEPS.filter(({ key }) => itemProgress[key]).length;
            const itemAllDone = doneSteps === 4;
            const subtitle = buildVaoItemSubtitle(item, index, lookups);
            const fullLabel = formatVaoItemFullLabel(subtitle);
            const vaoNumber = getVaoNumber(item, index);

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
                {/* Cabeçalho do vão — sempre visível */}
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
                  </button>

                  {/* Badge de progresso */}
                  <div className="flex items-center gap-2">
                    {itemAllDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {doneSteps}/4
                      </Badge>
                    )}
                  </div>

                  <button
                    type="button"
                    className="ml-1 shrink-0 text-muted-foreground"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Recolher" : "Expandir"} vão ${vaoNumber}`}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Conteúdo expansível */}
                {isExpanded && (
                  <div className="px-3 pb-3">
                    {/* Cada etapa: cabeçalho alinhado + atribuições */}
                    <div className="space-y-2.5">
                      {TRANSPORT_STEPS.map(({ key, label }, stepIndex) => {
                        const done = itemProgress[key];
                        const gate = gates[key];
                        const lKey = `${item.id}-${key}`;
                        const isLoading = loadingKey === lKey;
                        const isLocked = !gate.unlocked && !done;
                        const assignment = getVaoStepAssignment(item, key);
                        const showAssignment =
                          canAssignDriver ||
                          canAssignVehicle ||
                          !!assignment.driverId ||
                          !!assignment.vehicleId;
                        const isPerfilTotal = key === "perfilTotal";
                        const stepNumber = String(stepIndex + 1).padStart(2, "0");
                        const statusLabel = done
                          ? "Concluído"
                          : isLocked
                            ? "Bloqueado"
                            : "Pendente";

                        return (
                          <div
                            key={key}
                            className={cn(
                              "overflow-hidden rounded-lg border transition-colors",
                              done
                                ? "border-success-border bg-success-muted/30"
                                : isPerfilTotal
                                  ? "border-primary/35 bg-primary/4"
                                  : "border-border/80 bg-background",
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center gap-3 border-b px-3 py-2.5",
                                done
                                  ? "border-success-border/50 bg-success-muted/25"
                                  : isPerfilTotal
                                    ? "border-primary/15 bg-primary/6"
                                    : "border-border/60 bg-muted/30",
                              )}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                                {isLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : isLocked ? (
                                  <span
                                    title={gate.reason ?? undefined}
                                    className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border bg-muted/40"
                                  >
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground/70" />
                                  </span>
                                ) : (
                                  <Checkbox
                                    checked={done}
                                    disabled={isLoading || (isLocked && !done)}
                                    onCheckedChange={(v) =>
                                      handleToggle(item.id, key, v === true)
                                    }
                                    className={cn(
                                      "h-[18px] w-[18px]",
                                      done && "border-success bg-success",
                                    )}
                                    aria-label={`${label} — Vão ${vaoNumber}`}
                                    title={gate.reason ?? undefined}
                                  />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={cn(
                                      "font-mono text-[10px] font-semibold tracking-wider",
                                      done
                                        ? "text-success-foreground/70"
                                        : isPerfilTotal
                                          ? "text-primary/70"
                                          : "text-muted-foreground",
                                    )}
                                  >
                                    {stepNumber}
                                  </span>
                                  <span
                                    className={cn(
                                      "truncate text-sm leading-none",
                                      isPerfilTotal ? "font-semibold" : "font-medium",
                                      done
                                        ? "text-success-foreground"
                                        : isLocked
                                          ? "text-muted-foreground"
                                          : isPerfilTotal
                                            ? "text-primary"
                                            : "text-foreground",
                                    )}
                                  >
                                    {label}
                                  </span>
                                </div>
                                {done && (
                                  <StepAuditLine
                                    meta={getStepAuditMeta(
                                      stepAuditMeta,
                                      item.id,
                                      key,
                                    )}
                                  />
                                )}
                              </div>

                              <span
                                className={cn(
                                  "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                                  done
                                    ? "bg-success/15 text-success-foreground"
                                    : isLocked
                                      ? "bg-muted text-muted-foreground"
                                      : isPerfilTotal
                                        ? "bg-primary/10 text-primary"
                                        : "bg-background text-muted-foreground ring-1 ring-border",
                                )}
                              >
                                {statusLabel}
                              </span>
                            </div>

                            {showAssignment && (
                              <div className="px-3 py-2.5">
                                <VaoStepDriverSelect
                                  osId={osId}
                                  itemId={item.id}
                                  step={key}
                                  stepLabel={label}
                                  vaoNumber={vaoNumber}
                                  driverId={assignment.driverId}
                                  driverName={
                                    assignment.driverId
                                      ? (drivers.find((d) => d.id === assignment.driverId)?.name ?? null)
                                      : null
                                  }
                                  scheduledDate={assignment.scheduledDate}
                                  vehicleId={assignment.vehicleId}
                                  drivers={drivers}
                                  vehicles={vehicles}
                                  canChangeDriver={canAssignDriver}
                                  canChangeVehicle={canAssignVehicle}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <TransportVaoNotesField
                      osId={osId}
                      itemId={item.id}
                      vaoLabel={`Vão ${vaoNumber}`}
                      initialNotes={item.transportProgress?.observacoes}
                    />
                  </div>
                )}
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
