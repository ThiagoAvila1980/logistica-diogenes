"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { Select } from "@/components/ui/select";
import { assignDriverToAllVaosAction } from "@/actions/transport-actions";
import type { DriverOption } from "@/lib/data/drivers-db";

type Props = {
  osId: string;
  drivers: DriverOption[];
};

/** Atribui o mesmo motorista a todas as etapas de todos os vãos da OS. */
export function TransportBulkDriverSelect({ osId, drivers }: Props) {
  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function handleChange(value: string) {
    setSelectedDriverId(value);
    setLoading(true);
    setError(null);
    setOkMessage(null);

    const result = await assignDriverToAllVaosAction({
      osId,
      driverId: value || null,
    });

    if (!result.success) {
      setError(result.message);
    } else {
      setOkMessage(
        value
          ? "Motorista aplicado a todos os vãos"
          : "Motorista removido de todos os vãos",
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Select
          value={selectedDriverId}
          disabled={loading || drivers.length === 0}
          className="h-8 min-w-0 flex-1 text-xs sm:max-w-xs"
          onChange={(e) => void handleChange(e.target.value)}
          aria-label="Motorista para todos os vãos"
        >
          <option value="">
            {drivers.length === 0
              ? "Nenhum motorista cadastrado"
              : "Motorista para todos os vãos…"}
          </option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
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
