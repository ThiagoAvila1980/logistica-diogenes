"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Car, Loader2, UserRound, X } from "lucide-react";
import { Select } from "@/components/ui/select";
import { assignDriverToVaoAction } from "@/actions/transport-actions";
import type { DriverOption } from "@/lib/data/drivers-db";
import type { VehicleOptionForSelection } from "@/lib/data/vehicles-db";
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
  vehicleId: string | null;
  drivers: DriverOption[];
  vehicles: VehicleOptionForSelection[];
  canChangeDriver: boolean;
  canChangeVehicle: boolean;
};

function formatVehicleLabel(vehicle: VehicleOptionForSelection): string {
  const desc =
    vehicle.description.length > 28
      ? `${vehicle.description.slice(0, 27)}…`
      : vehicle.description;
  const inTransport = vehicle.unavailable ? " · em transporte" : "";
  return `${vehicle.plate} · ${desc}${inTransport}`;
}

/** Combobox compacto para designar motorista, data e veículo de um item de ticagem. */
export function VaoStepDriverSelect({
  osId,
  itemId,
  step,
  stepLabel,
  vaoNumber,
  driverId,
  driverName,
  scheduledDate,
  vehicleId,
  drivers,
  vehicles,
  canChangeDriver,
  canChangeVehicle,
}: Props) {
  const [selectedDriverId, setSelectedDriverId] = useState(driverId ?? "");
  const [selectedDate, setSelectedDate] = useState(scheduledDate ?? "");
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDriverId(driverId ?? "");
  }, [driverId]);

  useEffect(() => {
    setSelectedDate(scheduledDate ?? "");
  }, [scheduledDate]);

  useEffect(() => {
    setSelectedVehicleId(vehicleId ?? "");
  }, [vehicleId]);

  const canChange = canChangeDriver || canChangeVehicle;
  const assignedVehicle = selectedVehicleId
    ? vehicles.find((v) => v.id === selectedVehicleId)
    : undefined;

  async function persist(
    nextDriverId: string,
    nextDate: string,
    nextVehicleId: string,
  ) {
    setLoading(true);
    setError(null);

    const result = await assignDriverToVaoAction({
      osId,
      itemId,
      step,
      driverId: nextDriverId || null,
      scheduledTransportDate: nextDate || null,
      vehicleId: nextVehicleId || null,
    });

    if (!result.success) {
      setError(result.message);
    }
    setLoading(false);
  }

  function handleDriverChange(value: string) {
    setSelectedDriverId(value);
    void persist(value, selectedDate, selectedVehicleId);
  }

  function handleDateChange(value: string) {
    setSelectedDate(value);
    void persist(selectedDriverId, value, selectedVehicleId);
  }

  function handleVehicleChange(value: string) {
    setSelectedVehicleId(value);
    void persist(selectedDriverId, selectedDate, value);
  }

  function clearDriver() {
    handleDriverChange("");
  }

  function clearDate() {
    handleDateChange("");
  }

  function clearVehicle() {
    handleVehicleChange("");
  }

  if (!canChange) {
    return (
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <ReadOnlyField
          icon={<UserRound className="h-3.5 w-3.5" />}
          label="Motorista"
          value={
            driverId && driverName
              ? scheduledDate
                ? `${driverName} · ${formatDateDisplay(scheduledDate)}`
                : driverName
              : "Não definido"
          }
          filled={!!driverId}
        />
        <ReadOnlyField
          icon={<Car className="h-3.5 w-3.5" />}
          label="Veículo"
          value={
            assignedVehicle
              ? `${assignedVehicle.plate} · ${assignedVehicle.description}`
              : "Não definido"
          }
          filled={!!assignedVehicle}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_140px]">
        <FieldShell
          label="Motorista"
          icon={<UserRound className="h-3.5 w-3.5" />}
          filled={!!selectedDriverId}
          trailing={
            loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : selectedDriverId && canChangeDriver ? (
              <ClearFieldButton
                label={`Limpar motorista — ${stepLabel} — Vão ${vaoNumber}`}
                onClear={clearDriver}
              />
            ) : null
          }
        >
          <Select
            value={selectedDriverId}
            disabled={loading || !canChangeDriver || drivers.length === 0}
            className="h-9 w-full border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
            onChange={(e) => handleDriverChange(e.target.value)}
            aria-label={`Motorista — ${stepLabel} — Vão ${vaoNumber}`}
          >
            <option value="">
              {drivers.length === 0
                ? "Nenhum motorista cadastrado"
                : "Selecionar motorista"}
            </option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </Select>
        </FieldShell>

        <FieldShell
          label="Data"
          filled={!!selectedDate}
          trailing={
            selectedDate && canChangeDriver && !loading ? (
              <ClearFieldButton
                label={`Limpar data — ${stepLabel} — Vão ${vaoNumber}`}
                onClear={clearDate}
              />
            ) : null
          }
        >
          <input
            type="date"
            value={selectedDate}
            disabled={loading || !canChangeDriver}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-9 w-full bg-transparent text-xs tabular-nums outline-none disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Data do transporte — ${stepLabel} — Vão ${vaoNumber}`}
          />
        </FieldShell>
      </div>

      <FieldShell
        label="Veículo"
        icon={<Car className="h-3.5 w-3.5" />}
        filled={!!selectedVehicleId}
        trailing={
          selectedVehicleId && canChangeVehicle && !loading ? (
            <ClearFieldButton
              label={`Limpar veículo — ${stepLabel} — Vão ${vaoNumber}`}
              onClear={clearVehicle}
            />
          ) : null
        }
      >
        <Select
          value={selectedVehicleId}
          disabled={loading || !canChangeVehicle || vehicles.length === 0}
          className="h-9 w-full border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          onChange={(e) => handleVehicleChange(e.target.value)}
          aria-label={`Veículo — ${stepLabel} — Vão ${vaoNumber}`}
        >
          <option value="">
            {vehicles.length === 0
              ? "Nenhum veículo cadastrado"
              : "Selecionar veículo"}
          </option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {formatVehicleLabel(vehicle)}
            </option>
          ))}
        </Select>
      </FieldShell>

      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

function ClearFieldButton({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClear();
      }}
      className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label={label}
      title="Limpar seleção"
    >
      <X className="h-3 w-3" strokeWidth={2.25} />
    </button>
  );
}

function FieldShell({
  label,
  icon,
  filled,
  trailing,
  children,
}: {
  label: string;
  icon?: ReactNode;
  filled?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-md border px-2.5 py-1.5 transition-colors",
        filled
          ? "border-success-border/70 bg-success-muted/25"
          : "border-border/70 bg-card",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
        {trailing && <span className="ml-auto flex items-center">{trailing}</span>}
      </div>
      {children}
    </div>
  );
}

function ReadOnlyField({
  icon,
  label,
  value,
  filled,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  filled: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-2.5 py-1.5",
        filled ? "border-border/70 bg-muted/20" : "border-dashed border-border/70 bg-muted/10",
      )}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-xs",
          filled ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {value}
      </p>
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
