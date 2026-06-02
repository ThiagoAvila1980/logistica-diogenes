"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, Loader2 } from "lucide-react";
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
  const [selectedId, setSelectedId] = useState(vehicleId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedLabel =
    vehiclePlate != null
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
      <Card className="mb-4 border-teal-200 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-900/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-4 w-4 text-teal-600" />
            Veículo em uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{assignedLabel}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Car className="h-4 w-4 text-amber-600" />
          {vehicleId ? "Alterar veículo" : "Selecionar veículo"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {vehicleId
            ? "Você pode alterar o veículo antes de iniciar a primeira entrega."
            : "Escolha o veículo que será usado neste transporte. É obrigatório para iniciar a entrega do perfil estrutural."}
        </p>

        {vehicleId && assignedLabel && (
          <div className="flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Atual: <span className="font-medium">{assignedLabel}</span>
            </span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="vehicle-select">Veículo</Label>
          <Select
            id="vehicle-select"
            value={selectedId}
            disabled={loading || vehicles.length === 0}
            className="h-11"
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
                disabled={vehicle.unavailable}
              >
                {vehicle.description} ({vehicle.plate})
                {vehicle.unavailable ? " — em uso" : ""}
              </option>
            ))}
          </Select>
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
    </Card>
  );
}
