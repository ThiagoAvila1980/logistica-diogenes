"use client";

import { useEffect, useMemo, useState } from "react";
import { Car, CheckCircle2, ChevronDown, Loader2, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { assignVehicleToVaoAction } from "@/actions/transport-actions";
import type { VehicleOptionForSelection } from "@/lib/data/vehicles-db";
import { cn } from "@/lib/utils";

function formatVehicleOptionTitle(vehicle: VehicleOptionForSelection): string {
  return `${vehicle.plate} · ${vehicle.description}`;
}

function formatVehicleOptionLabel(vehicle: VehicleOptionForSelection): string {
  const desc =
    vehicle.description.length > 28
      ? `${vehicle.description.slice(0, 27)}…`
      : vehicle.description;
  const inTransport = vehicle.unavailable ? " · em transporte" : "";
  return `${vehicle.plate} · ${desc}${inTransport}`;
}

type Props = {
  osId: string;
  itemId: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  vehicles: VehicleOptionForSelection[];
  canChange: boolean;
  onAssigned?: (vehicleId: string | null) => void;
};

export function VehicleSelector({
  osId,
  itemId,
  vehicleId,
  vehiclePlate,
  vehicleDescription,
  vehicles,
  canChange,
  onAssigned,
}: Props) {
  const [assignedVehicleId, setAssignedVehicleId] = useState(vehicleId);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!vehicleId);

  useEffect(() => {
    setAssignedVehicleId(vehicleId);
  }, [vehicleId]);

  const vehicleIds = useMemo(
    () => new Set(vehicles.map((v) => v.id)),
    [vehicles],
  );

  useEffect(() => {
    if (assignedVehicleId && vehicleIds.has(assignedVehicleId)) {
      setSelectedId(assignedVehicleId);
    } else {
      setSelectedId("");
    }
  }, [assignedVehicleId, vehicleIds]);

  const assignedVehicle = assignedVehicleId
    ? vehicles.find((v) => v.id === assignedVehicleId)
    : undefined;

  const assignedLabel =
    assignedVehicleId != null
      ? assignedVehicle
        ? assignedVehicle.description
          ? `${assignedVehicle.description} (${assignedVehicle.plate})`
          : assignedVehicle.plate
        : vehiclePlate != null
          ? vehicleDescription
            ? `${vehicleDescription} (${vehiclePlate})`
            : vehiclePlate
          : null
      : null;

  const hasChanges = selectedId !== (assignedVehicleId ?? "");

  async function handleConfirm() {
    if (!hasChanges) return;
    setLoading(true);
    setError(null);

    const result = await assignVehicleToVaoAction({
      osId,
      itemId,
      vehicleId: selectedId || null,
    });

    if (result.success) {
      setAssignedVehicleId(selectedId || null);
      onAssigned?.(selectedId || null);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  if (assignedVehicleId && !canChange) {
    return (
      <Card className="mb-2 min-w-0 overflow-hidden border-success-border bg-success-muted/50">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-primary" />
            Veículo designado
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="min-w-0 truncate font-medium">{assignedLabel}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-2 min-w-0 overflow-hidden border-info-border bg-info-muted/60">
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 pt-3 pb-3 text-left"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={`vehicle-panel-${itemId}`}
        >
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <Car className="h-4 w-4 shrink-0 text-info" />
            <span className="truncate">
              {assignedVehicleId && assignedLabel ? assignedLabel : "Selecionar Veículo"}
            </span>
          </CardTitle>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </CardHeader>
      {open && (
        <CardContent id={`vehicle-panel-${itemId}`} className="space-y-3 pt-0">
          <p className="text-sm text-muted-foreground">
            {assignedVehicleId
              ? "Altere o veículo deste vão."
              : "Escolha o veículo deste vão. É obrigatório para iniciar a entrega do perfil estrutural."}
          </p>

          {assignedVehicleId && assignedLabel && (
            <div className="flex min-w-0 items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span className="min-w-0 truncate">
                Atual: <span className="font-medium">{assignedLabel}</span>
              </span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="min-w-0 space-y-2">
            <Label htmlFor={`vehicle-select-${itemId}`}>Veículo</Label>
            <div className="flex min-w-0 w-full max-w-full items-center gap-2">
              <div className="min-w-0 flex-1 overflow-hidden">
                <Select
                  id={`vehicle-select-${itemId}`}
                  value={selectedId}
                  disabled={loading || vehicles.length === 0}
                  className="h-11 w-full min-w-0 max-w-full truncate"
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">
                    {vehicles.length === 0
                      ? "Nenhum veículo cadastrado"
                      : "Selecione um veículo..."}
                  </option>
                  {vehicles.map((vehicle) => (
                    <option
                      key={vehicle.id}
                      value={vehicle.id}
                      title={formatVehicleOptionTitle(vehicle)}
                    >
                      {formatVehicleOptionLabel(vehicle)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Limpar seleção"
                aria-label="Limpar seleção do veículo"
                disabled={loading || !selectedId}
                onClick={() => setSelectedId("")}
                className="h-11 w-11 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            type="button"
            disabled={loading || !hasChanges}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : assignedVehicleId ? (
              "Confirmar alteração"
            ) : (
              "Confirmar veículo"
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
