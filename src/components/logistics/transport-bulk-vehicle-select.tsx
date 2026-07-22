"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import { assignVehicleToAllVaosAction } from "@/actions/transport-actions";
import type { VehicleOptionForSelection } from "@/lib/data/vehicles-db";

type Props = {
  osId: string;
  vehicles: VehicleOptionForSelection[];
};

function formatVehicleLabel(vehicle: VehicleOptionForSelection): string {
  const desc =
    vehicle.description.length > 28
      ? `${vehicle.description.slice(0, 27)}…`
      : vehicle.description;
  const inTransport = vehicle.unavailable ? " · em transporte" : "";
  return `${vehicle.plate} · ${desc}${inTransport}`;
}

/** Atribui o mesmo veículo a todas as etapas de todos os vãos da OS. */
export function TransportBulkVehicleSelect({ osId, vehicles }: Props) {
  const router = useRouter();
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function handleChange(value: string) {
    setSelectedVehicleId(value);
    setLoading(true);
    setError(null);
    setOkMessage(null);

    const result = await assignVehicleToAllVaosAction({
      osId,
      vehicleId: value || null,
    });

    if (!result.success) {
      setError(result.message);
    } else {
      setOkMessage(
        value
          ? "Veículo aplicado a todos os vãos"
          : "Veículo removido de todos os vãos",
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Select
          value={selectedVehicleId}
          disabled={loading || vehicles.length === 0}
          className="h-8 min-w-0 flex-1 text-xs sm:max-w-xs"
          onChange={(e) => void handleChange(e.target.value)}
          aria-label="Veículo para todos os vãos"
        >
          <option value="">
            {vehicles.length === 0
              ? "Nenhum veículo cadastrado"
              : "Veículo para todos os vãos…"}
          </option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {formatVehicleLabel(vehicle)}
            </option>
          ))}
        </Select>
        {loading && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {okMessage && !error && (
        <p className="text-[11px] text-success-foreground">{okMessage}</p>
      )}
    </div>
  );
}
