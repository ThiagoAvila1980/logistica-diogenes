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
import { DriverSelector } from "@/components/logistics/driver-selector";
import { VehicleSelector } from "@/components/logistics/vehicle-selector";
import { TransportVaoNotesField } from "@/components/logistics/transport-vao-notes";
import type { VehicleOptionForSelection } from "@/lib/data/vehicles-db";
import {
  getItemTransportGates,
  type TransportStep,
} from "@/lib/logistics/transport-item-gates";

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
}: Props) {
  const [progress, setProgress] = useState<Record<string, ItemTransportProgress>>(
    () =>
      Object.fromEntries(
        items.map((item) => [item.id, getItemTransportProgress(item)]),
      ),
  );
  const [vehicleOverrides, setVehicleOverrides] = useState<
    Record<string, string | null>
  >({});
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
            const itemVehicleId =
              item.id in vehicleOverrides
                ? vehicleOverrides[item.id]
                : (item.transportProgress?.vehicleId ?? null);
            const itemVehicle = itemVehicleId
              ? vehicles.find((v) => v.id === itemVehicleId)
              : undefined;
            const gates = getItemTransportGates(
              item,
              osStatus,
              Boolean(itemVehicleId),
            );
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
                    {/* Desktop: grid com 4 colunas de checkboxes */}
                    <div className="hidden items-center gap-4 sm:grid sm:grid-cols-[1fr_repeat(4,88px)]">
                      <div />
                      {TRANSPORT_STEPS.map(({ key, label }) => (
                        <span
                          key={key}
                          className="text-center text-[10px] font-medium leading-tight text-muted-foreground"
                        >
                          {label}
                        </span>
                      ))}
                      <div className="min-w-0" />
                      {TRANSPORT_STEPS.map(({ key, label }) => {
                        const done = itemProgress[key];
                        const gate = gates[key];
                        const lKey = `${item.id}-${key}`;
                        const isLoading = loadingKey === lKey;
                        const needsVehicle = key === "perfilEstrutural" && !itemVehicleId;
                        const isLocked = !gate.unlocked || needsVehicle;

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
                                aria-label={`${label} — Vão ${vaoNumber}`}
                                title={gate.reason ?? undefined}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Mobile: 4 botões */}
                    <div className="grid grid-cols-4 gap-1.5 sm:hidden">
                      {TRANSPORT_STEPS.map(({ key, shortLabel: stepLabel }) => {
                        const done = itemProgress[key];
                        const gate = gates[key];
                        const lKey = `${item.id}-${key}`;
                        const isLoading = loadingKey === lKey;
                        const needsVehicle = key === "perfilEstrutural" && !itemVehicleId;
                        const isLocked = (!gate.unlocked || needsVehicle) && !done;

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
                                aria-label={`${stepLabel} — Vão ${vaoNumber}`}
                                title={gate.reason ?? undefined}
                              />
                            )}
                            <span
                              className={cn(
                                "text-[11px] font-medium leading-tight",
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

                    <TransportVaoNotesField
                      osId={osId}
                      itemId={item.id}
                      vaoLabel={`Vão ${vaoNumber}`}
                      initialNotes={item.transportProgress?.observacoes}
                    />

                    {(canAssignVehicle || itemVehicleId) && (
                      <div className="mt-2.5">
                        <VehicleSelector
                          osId={osId}
                          itemId={item.id}
                          vehicleId={itemVehicleId}
                          vehiclePlate={itemVehicle?.plate ?? null}
                          vehicleDescription={itemVehicle?.description ?? null}
                          vehicles={vehicles}
                          canChange={canAssignVehicle}
                          onAssigned={(vehicleId) =>
                            setVehicleOverrides((prev) => ({
                              ...prev,
                              [item.id]: vehicleId,
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Motorista por vão */}
                    {(canAssignDriver || item.transportProgress?.driverId) && (
                      <div className="mt-2.5">
                        <DriverSelector
                          osId={osId}
                          itemId={item.id}
                          driverId={item.transportProgress?.driverId ?? null}
                          driverName={
                            item.transportProgress?.driverId
                              ? (drivers.find((d) => d.id === item.transportProgress?.driverId)?.name ?? null)
                              : null
                          }
                          scheduledTransportDate={
                            item.transportProgress?.scheduledTransportDate
                              ? new Date(item.transportProgress.scheduledTransportDate)
                              : null
                          }
                          drivers={drivers}
                          canChange={canAssignDriver}
                        />
                      </div>
                    )}
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
