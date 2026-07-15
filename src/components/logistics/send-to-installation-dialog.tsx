"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Hammer } from "lucide-react";
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
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import {
  buildVaoItemSubtitle,
  formatVaoItemFullLabel,
  getVaoNumber,
} from "@/lib/measurement/vao-item-subtitle";

type SendToInstallationDialogProps = {
  osId: string;
  osNumber: string;
  clientName: string;
  items: MeasurementLineItem[];
  lookups?: MeasurementLookups;
};

function defaultSelectedIds(items: MeasurementLineItem[]): Set<string> {
  const notSent = items.filter((item) => !item.installationProgress);
  if (notSent.length > 0) {
    return new Set(notSent.map((item) => item.id));
  }
  return new Set(items.map((item) => item.id));
}

export function SendToInstallationDialog({
  osId,
  osNumber,
  clientName,
  items,
  lookups,
}: SendToInstallationDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vaoDialogOpen, setVaoDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    defaultSelectedIds(items),
  );

  const handleOpen = useCallback(() => {
    setError(null);
    setSuccess(null);
    setSelectedIds(defaultSelectedIds(items));
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
    startTransition(async () => {
      const result = await sendVaosToInstallationAction({
        osId,
        selectedItemIds: selected,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setVaoDialogOpen(false);
      setSuccess(result.message);
      router.refresh();
    });
  }, [osId, selectedIds, router]);

  if (items.length === 0) return null;

  const allSelected = selectedIds.size === items.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="space-y-3">
      {error && !vaoDialogOpen && (
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
              Selecione quais vãos enviar para instalação. O instalador é
              escolhido depois, na tela de instalação.
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
                const vaoNumber = getVaoNumber(item, index);
                const checked = selectedIds.has(item.id);
                const alreadySent = Boolean(item.installationProgress);

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
                        Vão {vaoNumber}
                        {alreadySent ? (
                          <span className="ml-1.5 font-normal text-muted-foreground">
                            (já enviado)
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
              {isPending ? "Enviando…" : "Confirmar envio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
