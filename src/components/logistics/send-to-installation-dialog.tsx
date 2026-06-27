"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Hammer,
  Loader2,
  UserCheck,
} from "lucide-react";
import { sendVaosToInstallationAction } from "@/actions/installer-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import type { InstallerOption } from "@/lib/data/installers-db";
import {
  buildVaoItemSubtitle,
  formatVaoItemFullLabel,
} from "@/lib/measurement/vao-item-subtitle";

type SendToInstallationDialogProps = {
  osId: string;
  osNumber: string;
  clientName: string;
  items: MeasurementLineItem[];
  installers: InstallerOption[];
  lookups?: MeasurementLookups;
};

function defaultSelectedIds(items: MeasurementLineItem[]): Set<string> {
  const unassigned = items.filter((item) => !item.installationProgress?.installerId);
  if (unassigned.length > 0) {
    return new Set(unassigned.map((item) => item.id));
  }
  return new Set(items.map((item) => item.id));
}

export function SendToInstallationDialog({
  osId,
  osNumber,
  clientName,
  items,
  installers,
  lookups,
}: SendToInstallationDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vaoDialogOpen, setVaoDialogOpen] = useState(false);
  const [installerDialogOpen, setInstallerDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    defaultSelectedIds(items),
  );
  const [pendingSelectedIds, setPendingSelectedIds] = useState<string[]>([]);
  const [selectedInstallerId, setSelectedInstallerId] = useState("");

  const handleOpen = useCallback(() => {
    setError(null);
    setSuccess(null);
    setSelectedIds(defaultSelectedIds(items));
    setSelectedInstallerId("");
    setVaoDialogOpen(true);
  }, [items]);

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleConfirmVaos = useCallback(() => {
    const selected = [...selectedIds];
    if (selected.length === 0) {
      setError("Selecione ao menos um vão para enviar.");
      return;
    }
    setError(null);
    setPendingSelectedIds(selected);
    setVaoDialogOpen(false);
    setInstallerDialogOpen(true);
  }, [selectedIds]);

  const handleConfirmInstaller = useCallback(() => {
    if (!selectedInstallerId) {
      setError("Selecione um instalador.");
      return;
    }
    setError(null);
    setInstallerDialogOpen(false);
    startTransition(async () => {
      const result = await sendVaosToInstallationAction({
        osId,
        selectedItemIds: pendingSelectedIds,
        installerId: selectedInstallerId,
      });
      if (!result.success) {
        setError(result.message);
        setInstallerDialogOpen(true);
        return;
      }
      setSuccess(result.message);
      router.refresh();
    });
  }, [osId, pendingSelectedIds, selectedInstallerId, router]);

  if (items.length === 0) return null;

  const allSelected = selectedIds.size === items.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="space-y-3">
      {error && !vaoDialogOpen && !installerDialogOpen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        className="h-12 w-full text-base"
        onClick={handleOpen}
        disabled={isPending}
      >
        <Hammer className="mr-2 h-4 w-4" />
        {isPending ? "Enviando…" : "Enviar para instalação"}
      </Button>

      <Dialog
        open={vaoDialogOpen}
        onOpenChange={(open) => {
          if (!isPending) setVaoDialogOpen(open);
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-4 w-4 shrink-0" />
              Enviar para instalação
            </DialogTitle>
            <DialogDescription>
              Selecione quais vãos enviar para instalação.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            <div className="min-w-0 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p className="truncate font-mono font-medium">{osNumber}</p>
              <p className="truncate text-muted-foreground">{clientName}</p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedIds(new Set(items.map((item) => item.id)));
                  else setSelectedIds(new Set());
                }}
              />
              Todos os vãos
            </label>

            <div className="min-w-0 space-y-1.5 rounded-md border bg-muted/10 p-2">
              {items.map((item, index) => {
                const subtitle = buildVaoItemSubtitle(item, index, lookups);
                const fullLabel = formatVaoItemFullLabel(subtitle);
                const checked = selectedIds.has(item.id);
                const hasInstaller = Boolean(item.installationProgress?.installerId);

                return (
                  <Label
                    key={item.id}
                    className="flex min-w-0 cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-px shrink-0"
                    />
                    <span className="min-w-0 flex-1 overflow-hidden">
                      <span className="block text-xs font-semibold leading-snug">
                        Vão {index + 1}
                        {hasInstaller ? (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            (já designado)
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="mt-0.5 block wrap-break-word text-xs leading-snug text-muted-foreground"
                        title={fullLabel}
                      >
                        {fullLabel}
                      </span>
                    </span>
                  </Label>
                );
              })}
            </div>
          </div>

          {error && vaoDialogOpen && (
            <p className="shrink-0 text-center text-xs text-destructive">{error}</p>
          )}

          {noneSelected && (
            <p className="shrink-0 text-center text-xs text-destructive">
              Selecione ao menos um vão.
            </p>
          )}

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVaoDialogOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmVaos}
              disabled={isPending || noneSelected}
            >
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={installerDialogOpen}
        onOpenChange={(open) => {
          if (!isPending) {
            setInstallerDialogOpen(open);
            if (!open) setError(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 shrink-0" />
              Escolher instalador
            </DialogTitle>
            <DialogDescription>
              Selecione o instalador responsável pelos vãos escolhidos.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            <div className="min-w-0 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p className="truncate font-mono font-medium">{osNumber}</p>
              <p className="truncate text-muted-foreground">
                {pendingSelectedIds.length === 1
                  ? "1 vão selecionado"
                  : `${pendingSelectedIds.length} vãos selecionados`}
              </p>
            </div>

            {installers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum instalador cadastrado.
              </p>
            ) : (
              <div className="min-w-0 space-y-1.5 rounded-md border bg-muted/10 p-2">
                {installers.map((installer) => {
                  const selected = selectedInstallerId === installer.id;
                  return (
                    <button
                      key={installer.id}
                      type="button"
                      onClick={() => setSelectedInstallerId(installer.id)}
                      className={cn(
                        "flex w-full min-w-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border border-primary bg-primary/10"
                          : "border border-transparent hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          selected && "border-primary bg-primary",
                        )}
                        aria-hidden
                      >
                        {selected ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                        ) : null}
                      </span>
                      <span className="min-w-0 truncate font-medium">{installer.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && installerDialogOpen && (
            <Alert variant="destructive" className="shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInstallerDialogOpen(false);
                setVaoDialogOpen(true);
              }}
              disabled={isPending}
            >
              Voltar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmInstaller}
              disabled={
                isPending || !selectedInstallerId || installers.length === 0
              }
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Confirmando…
                </>
              ) : (
                <>
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                  Confirmar instalador
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
