"use client";

import { useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { Select } from "@/components/ui/select";
import { assignInstallerToVaoAction } from "@/actions/installer-actions";
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

/** Combobox compacto para designar o instalador diretamente no vão, na tela de instalação. */
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(nextValue: string) {
    const previous = value;
    setValue(nextValue);
    setLoading(true);
    setError(null);

    const result = await assignInstallerToVaoAction({
      osId,
      itemId,
      installerId: nextValue || null,
      scheduledInstallationDate,
    });

    if (!result.success) {
      setValue(previous);
      setError(result.message);
    }
    setLoading(false);
  }

  if (!canChange) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserCheck className="h-3.5 w-3.5 shrink-0" />
        {installerId && installerName ? (
          <span className="font-medium text-foreground">{installerName}</span>
        ) : (
          <span>Instalador não definido</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <UserCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <Select
        value={value}
        disabled={loading || installers.length === 0}
        className="h-8 w-auto min-w-0 max-w-[220px] text-xs"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleChange(e.target.value)}
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
      {loading && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      )}
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
