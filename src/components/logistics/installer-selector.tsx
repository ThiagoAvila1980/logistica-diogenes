"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronDown, Loader2, UserCheck } from "lucide-react";
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
import { assignInstallerToOsAction } from "@/actions/installer-actions";
import type { InstallerOption } from "@/lib/data/installers-db";
import { cn } from "@/lib/utils";

type Props = {
  osId: string;
  installerId: string | null;
  installerName: string | null;
  scheduledInstallationDate: Date | null;
  installers: InstallerOption[];
  canChange: boolean;
};

export function InstallerSelector({
  osId,
  installerId,
  installerName,
  scheduledInstallationDate,
  installers,
  canChange,
}: Props) {
  const router = useRouter();
  const [selectedInstallerId, setSelectedInstallerId] = useState(
    installerId ?? "",
  );
  const [selectedDate, setSelectedDate] = useState(
    scheduledInstallationDate
      ? formatDateForInput(scheduledInstallationDate)
      : "",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!installerId);

  useEffect(() => {
    setSelectedInstallerId(installerId ?? "");
    setSelectedDate(
      scheduledInstallationDate
        ? formatDateForInput(scheduledInstallationDate)
        : "",
    );
  }, [installerId, scheduledInstallationDate]);

  const hasChanges =
    selectedInstallerId !== (installerId ?? "") ||
    selectedDate !== (scheduledInstallationDate ? formatDateForInput(scheduledInstallationDate) : "");

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    const result = await assignInstallerToOsAction({
      osId,
      installerId: selectedInstallerId || null,
      scheduledInstallationDate: selectedDate || null,
    });

    if (result.success) {
      router.refresh();
    } else {
      setError(result.message);
    }
    setLoading(false);
  }

  if (!canChange && installerId) {
    return (
      <Card className="mb-4 min-w-0 overflow-hidden border-success-border bg-success-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-primary" />
            Instalador designado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span className="font-medium">{installerName ?? "—"}</span>
          </div>
          {scheduledInstallationDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>
                Agendado para:{" "}
                <span className="font-medium">
                  {formatDateDisplay(scheduledInstallationDate)}
                </span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 min-w-0 overflow-hidden border-warning-border bg-warning-muted/60">
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-6 pt-3 pb-3 text-left"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="installer-selector-panel"
        >
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 shrink-0 text-warning" />
            <span className="truncate">
              {installerId && installerName
                ? installerName
                : "Selecionar Instalador"}
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
        <CardContent id="installer-selector-panel" className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {installerId
            ? "Altere o instalador responsável e/ou a data agendada."
            : "Escolha o instalador que realizará o serviço e, opcionalmente, a data agendada."}
        </p>

        {installerId && installerName && (
          <div className="flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            <span>
              Atual:{" "}
              <span className="font-medium">{installerName}</span>
              {scheduledInstallationDate && (
                <span className="text-muted-foreground">
                  {" "}— {formatDateDisplay(scheduledInstallationDate)}
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
          <Label htmlFor="installer-select">Instalador</Label>
          <Select
            id="installer-select"
            value={selectedInstallerId}
            disabled={loading || installers.length === 0}
            className="h-11"
            onChange={(e) => setSelectedInstallerId(e.target.value)}
          >
            <option value="">
              {installers.length === 0
                ? "Nenhum instalador cadastrado"
                : "Selecione um instalador..."}
            </option>
            {installers.map((installer) => (
              <option key={installer.id} value={installer.id}>
                {installer.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="installation-date">Data de instalação (opcional)</Label>
          <input
            id="installation-date"
            type="date"
            value={selectedDate}
            disabled={loading}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <Button
          type="button"
          disabled={loading || !hasChanges || installers.length === 0}
          onClick={handleConfirm}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirmando...
            </>
          ) : installerId ? (
            "Confirmar alteração"
          ) : (
            "Confirmar instalador"
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
