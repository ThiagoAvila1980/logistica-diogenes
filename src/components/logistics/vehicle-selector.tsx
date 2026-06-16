"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
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
import { assignVehicleToTransportAction } from "@/actions/transport-actions";
import type { VehicleOptionForSelection } from "@/lib/data/vehicles-db";
import { cn } from "@/lib/utils";

function formatVehicleOptionTitle(vehicle: VehicleOptionForSelection): string {
  return `${vehicle.plate} · ${vehicle.description}`;
}

/** Texto curto nas <option> — o select nativo usa a opção mais longa como largura mínima. */
function formatVehicleOptionLabel(vehicle: VehicleOptionForSelection): string {
  const desc =
    vehicle.description.length > 28
      ? `${vehicle.description.slice(0, 27)}…`
      : vehicle.description;
  return `${vehicle.plate} · ${desc}`;
}

type Props = {
  osId: string;
  vehicleId: string | null;
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  vehicles: VehicleOptionForSelection[];
  canChange: boolean;
};

export function VehicleSelector({
  osId,
  vehicleId,
  vehiclePlate,
  vehicleDescription,
  vehicles,
  canChange,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!vehicleId);

  const vehicleIds = useMemo(
    () => new Set(vehicles.map((v) => v.id)),
    [vehicles],
  );

  useEffect(() => {
    if (vehicleId && vehicleIds.has(vehicleId)) {
      setSelectedId(vehicleId);
    } else {
      setSelectedId("");
    }
  }, [vehicleId, vehicleIds]);

  const assignedLabel =
    vehicleId != null && vehiclePlate != null
      ? vehicleDescription
        ? `${vehicleDescription} (${vehiclePlate})`
        : vehiclePlate
      : null;

  async function handleConfirm() {
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    const result = await assignVehicleToTransportAction({
      osId,
      vehicleId: selectedId,
    });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  if (vehicleId && !canChange) {
    return (
      <Card className="mb-4 min-w-0 overflow-hidden border-success-border bg-success-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-4 w-4 text-primary" />
            Veículo em uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="min-w-0 truncate font-medium">{assignedLabel}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 min-w-0 overflow-hidden border-info-border bg-info-muted/60">
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-6 pt-3 pb-3 text-left"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="vehicle-selector-panel"
        >
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <Car className="h-4 w-4 shrink-0 text-info" />
            <span className="truncate">
              {vehicleId && assignedLabel ? assignedLabel : "Selecionar Veículo"}
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
        <CardContent id="vehicle-selector-panel" className="space-y-3">
          <p className="text-sm text-muted-foreground">
          {vehicleId
            ? "Você pode alterar o veículo a qualquer momento."
            : "Escolha o veículo que será usado neste transporte. É obrigatório para iniciar a entrega do perfil estrutural."}
        </p>

        {vehicleId && assignedLabel && (
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
          <Label htmlFor="vehicle-select">Veículo</Label>
          <div className="min-w-0 w-full max-w-full overflow-hidden">
            <Select
              id="vehicle-select"
              value={selectedId}
              disabled={loading || vehicles.length === 0}
              className="h-11 w-full min-w-0 max-w-full truncate"
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">
                {vehicles.length === 0
                  ? "Nenhum veículo disponível"
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
        </div>

        <Button
          type="button"
          disabled={
            loading ||
            !selectedId ||
            selectedId === vehicleId ||
            vehicles.length === 0
          }
          onClick={handleConfirm}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirmando...
            </>
          ) : vehicleId ? (
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
