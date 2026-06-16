"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronDown, Loader2, UserRound } from "lucide-react";
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
import { assignDriverToVaoAction } from "@/actions/transport-actions";
import type { DriverOption } from "@/lib/data/drivers-db";
import { cn } from "@/lib/utils";

type Props = {
  osId: string;
  itemId: string;
  driverId: string | null;
  driverName: string | null;
  scheduledTransportDate: Date | null;
  drivers: DriverOption[];
  canChange: boolean;
};

export function DriverSelector({
  osId,
  itemId,
  driverId,
  driverName,
  scheduledTransportDate,
  drivers,
  canChange,
}: Props) {
  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState(driverId ?? "");
  const [selectedDate, setSelectedDate] = useState(
    scheduledTransportDate
      ? formatDateForInput(scheduledTransportDate)
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!driverId);

  useEffect(() => {
    setSelectedDriverId(driverId ?? "");
    setSelectedDate(
      scheduledTransportDate
        ? formatDateForInput(scheduledTransportDate)
        : "",
    );
  }, [driverId, scheduledTransportDate]);

  const hasChanges =
    selectedDriverId !== (driverId ?? "") ||
    selectedDate !==
      (scheduledTransportDate
        ? formatDateForInput(scheduledTransportDate)
        : "");

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const result = await assignDriverToVaoAction({
      osId,
      itemId,
      driverId: selectedDriverId || null,
      scheduledTransportDate: selectedDate || null,
    });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  if (!canChange && driverId) {
    return (
      <Card className="mb-2 min-w-0 overflow-hidden border-success-border bg-success-muted/50">
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserRound className="h-4 w-4 text-primary" />
            Motorista designado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pb-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="font-medium">{driverName ?? "—"}</span>
          </div>
          {scheduledTransportDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>
                Data do transporte:{" "}
                <span className="font-medium">
                  {formatDateDisplay(scheduledTransportDate)}
                </span>
              </span>
            </div>
          )}
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
          aria-controls={`driver-panel-${itemId}`}
        >
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
            <UserRound className="h-4 w-4 shrink-0 text-info" />
            <span className="truncate">
              {driverId && driverName ? driverName : "Selecionar Motorista"}
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
        <CardContent id={`driver-panel-${itemId}`} className="space-y-3 pt-0">
          <p className="text-sm text-muted-foreground">
            {driverId
              ? "Altere o motorista responsável e/ou a data do transporte."
              : "Escolha o motorista deste vão e, opcionalmente, a data do transporte."}
          </p>

          {driverId && driverName && (
            <div className="flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <span>
                Atual:{" "}
                <span className="font-medium">{driverName}</span>
                {scheduledTransportDate && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {formatDateDisplay(scheduledTransportDate)}
                  </span>
                )}
              </span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={`driver-select-${itemId}`}>Motorista</Label>
            <Select
              id={`driver-select-${itemId}`}
              value={selectedDriverId}
              disabled={loading || drivers.length === 0}
              className="h-11"
              onChange={(e) => setSelectedDriverId(e.target.value)}
            >
              <option value="">
                {drivers.length === 0
                  ? "Nenhum motorista cadastrado"
                  : "Selecione um motorista..."}
              </option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`transport-date-${itemId}`}>Data do transporte</Label>
            <input
              id={`transport-date-${itemId}`}
              type="date"
              value={selectedDate}
              disabled={loading}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Button
            type="button"
            disabled={loading || !hasChanges || drivers.length === 0}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : driverId ? (
              "Confirmar alteração"
            ) : (
              "Confirmar motorista"
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function formatDateForInput(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
