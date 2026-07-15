"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, UserRound } from "lucide-react";
import { Select } from "@/components/ui/select";
import { assignDriverToVaoAction } from "@/actions/transport-actions";
import type { DriverOption } from "@/lib/data/drivers-db";
import type { TransportStep } from "@/lib/logistics/transport-item-gates";
import { cn } from "@/lib/utils";

type Props = {
  osId: string;
  itemId: string;
  step: TransportStep;
  stepLabel: string;
  vaoNumber: number;
  driverId: string | null;
  driverName: string | null;
  scheduledDate: string | null;
  drivers: DriverOption[];
  canChange: boolean;
};

/** Combobox compacto para designar motorista e data de um item de ticagem específico do vão. */
export function VaoStepDriverSelect({
  osId,
  itemId,
  step,
  stepLabel,
  vaoNumber,
  driverId,
  driverName,
  scheduledDate,
  drivers,
  canChange,
}: Props) {
  const [selectedDriverId, setSelectedDriverId] = useState(driverId ?? "");
  const [selectedDate, setSelectedDate] = useState(scheduledDate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(nextDriverId: string, nextDate: string) {
    setLoading(true);
    setError(null);

    const result = await assignDriverToVaoAction({
      osId,
      itemId,
      step,
      driverId: nextDriverId || null,
      scheduledTransportDate: nextDate || null,
    });

    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  }

  function handleDriverChange(value: string) {
    setSelectedDriverId(value);
    void persist(value, selectedDate);
  }

  function handleDateChange(value: string) {
    setSelectedDate(value);
    void persist(selectedDriverId, value);
  }

  if (!canChange) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
        <UserRound className="h-3.5 w-3.5 shrink-0" />
        {driverId && driverName ? (
          <span className="font-medium text-foreground">{driverName}</span>
        ) : (
          "Não definido"
        )}
        {scheduledDate && (
          <span className="tabular-nums">— {formatDateDisplay(scheduledDate)}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5",
        selectedDriverId ? "border-success-border bg-success-muted/40" : "bg-muted/20",
      )}
    >
      <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Select
        value={selectedDriverId}
        disabled={loading || drivers.length === 0}
        className="h-8 min-w-0 flex-1 text-xs"
        onChange={(e) => handleDriverChange(e.target.value)}
        aria-label={`Motorista — ${stepLabel} — Vão ${vaoNumber}`}
      >
        <option value="">
          {drivers.length === 0 ? "Nenhum motorista cadastrado" : "Selecionar motorista"}
        </option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.name}
          </option>
        ))}
      </Select>
      <input
        type="date"
        value={selectedDate}
        disabled={loading}
        onChange={(e) => handleDateChange(e.target.value)}
        className="h-8 w-[124px] shrink-0 rounded-md border border-input bg-background px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Data do transporte — ${stepLabel} — Vão ${vaoNumber}`}
      />
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : selectedDriverId ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
      ) : null}
      {error && <span className="w-full text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

function formatDateDisplay(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
