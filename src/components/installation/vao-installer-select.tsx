"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, UserCheck } from "lucide-react";
import { Select } from "@/components/ui/select";
import { assignInstallerToVaoAction } from "@/actions/installer-actions";
import { formatBrDate, getLocalIsoDate } from "@/lib/date-format";
import type { InstallerOption } from "@/lib/data/installers-db";

type Props = {
  osId: string;
  itemId: string;
  vaoNumber: number;
  installerId: string | null;
  installerName: string | null;
  scheduledInstallationDate: string | null;
  installers: InstallerOption[];
  canChange: boolean;
};

/** Combobox compacto para designar o instalador (e a data de agendamento) no vão. */
export function VaoInstallerSelect({
  osId,
  itemId,
  vaoNumber,
  installerId,
  installerName,
  scheduledInstallationDate,
  installers,
  canChange,
}: Props) {
  const [value, setValue] = useState(installerId ?? "");
  const [date, setDate] = useState(scheduledInstallationDate ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(installerId ?? "");
  }, [installerId]);

  useEffect(() => {
    setDate(scheduledInstallationDate ?? "");
  }, [scheduledInstallationDate]);

  async function persist(nextInstallerId: string, nextDate: string) {
    setLoading(true);
    setError(null);

    const result = await assignInstallerToVaoAction({
      osId,
      itemId,
      installerId: nextInstallerId || null,
      scheduledInstallationDate: nextDate || null,
    });

    if (!result.success) {
      setError(result.message);
      return false;
    }
    return true;
  }

  async function handleInstallerChange(nextValue: string) {
    const previousValue = value;
    const previousDate = date;
    setValue(nextValue);

    // Ao selecionar um instalador sem data definida, agenda para hoje.
    const nextDate =
      nextValue && !date ? getLocalIsoDate() : nextValue ? date : "";
    setDate(nextDate);

    const ok = await persist(nextValue, nextDate);
    if (!ok) {
      setValue(previousValue);
      setDate(previousDate);
    }
    setLoading(false);
  }

  async function handleDateChange(nextDate: string) {
    const previousDate = date;
    setDate(nextDate);

    const ok = await persist(value, nextDate);
    if (!ok) setDate(previousDate);
    setLoading(false);
  }

  if (!canChange) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5 shrink-0" />
          {installerId && installerName ? (
            <span className="font-medium text-foreground">{installerName}</span>
          ) : (
            <span>Instalador não definido</span>
          )}
        </span>
        {date && (
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium tabular-nums text-foreground">
              {formatBrDate(date)}
            </span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Select
          value={value}
          disabled={loading || installers.length === 0}
          className="h-8 w-auto min-w-0 max-w-[200px] text-xs"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void handleInstallerChange(e.target.value)}
          aria-label={`Selecionar instalador — Vão ${vaoNumber}`}
        >
          <option value="">
            {installers.length === 0
              ? "Nenhum instalador cadastrado"
              : "Selecionar instalador"}
          </option>
          {installers.map((installer) => (
            <option key={installer.id} value={installer.id}>
              {installer.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="date"
          value={date}
          disabled={loading}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => void handleDateChange(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Data de agendamento — Vão ${vaoNumber}`}
        />
      </div>

      {loading && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
