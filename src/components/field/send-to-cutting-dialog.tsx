"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Scissors } from "lucide-react";
import { sendItemsToCuttingAction } from "@/actions/cutting-actions";
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
import { getAllowedTransitions } from "@/lib/workflow/status-machine";
import type { OsStatus } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import { formatDimensionsSummary } from "@/lib/measurement/dimensions";
import { getVaoNumber } from "@/lib/measurement/vao-item-subtitle";

const SOURCE_STATUS: OsStatus = "medicao_final";
const DEST_STATUS: OsStatus = "cortes";

function buildItemLabel(
  item: MeasurementLineItem,
  index: number,
  lookups?: MeasurementLookups,
): string {
  const ambiente = resolveLookupLabel(
    lookups?.ambientes ?? [],
    item.idAmbiente ?? null,
  );
  const dims = formatDimensionsSummary(item);
  if (ambiente && dims) return `${ambiente} — ${dims}`;
  if (ambiente) return ambiente;
  if (dims) return dims;
  return `Vão ${getVaoNumber(item, index)}`;
}

type SendToCuttingDialogProps = {
  osId: string;
  osNumber: string;
  clientName: string;
  orderStatus: OsStatus;
  items: MeasurementLineItem[];
  lookups?: MeasurementLookups;
};

export function SendToCuttingDialog({
  osId,
  osNumber,
  clientName,
  orderStatus,
  items,
  lookups,
}: SendToCuttingDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Todos selecionados por padrão; exclui itens sem dimensões válidas
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(items.map((i) => i.id)),
  );

  const canSend =
    orderStatus === SOURCE_STATUS &&
    getAllowedTransitions(orderStatus).includes(DEST_STATUS);

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const handleOpen = useCallback(() => {
    setError(null);
    setSuccess(null);
    // Reinicia seleção com todos marcados
    setSelectedIds(new Set(items.map((i) => i.id)));
    setOpen(true);
  }, [items]);

  const handleConfirm = useCallback(() => {
    const selected = [...selectedIds];
    if (selected.length === 0) {
      setError("Selecione ao menos um vão para enviar.");
      return;
    }
    setOpen(false);
    startTransition(async () => {
      const result = await sendItemsToCuttingAction({
        osId,
        selectedItemIds: selected,
      });
      if (!result.success) {
        setError(result.message ?? "Não foi possível enviar para o corte.");
        return;
      }
      setSuccess(
        result.notificationSummary ?? "Vãos enviados para o plano de corte.",
      );
      router.push("/field");
      router.refresh();
    });
  }, [osId, selectedIds, router]);

  if (!canSend) return null;

  const allSelected = selectedIds.size === items.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="space-y-3">
      {error && (
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
        <Scissors className="mr-2 h-4 w-4" />
        {isPending ? "Enviando…" : "Enviar para corte"}
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!isPending) setOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Enviar para o plano de corte
            </DialogTitle>
            <DialogDescription>
              Selecione quais vãos enviar para o corte.
            </DialogDescription>
          </DialogHeader>

          {/* Resumo da OS */}
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-mono font-medium">{osNumber}</p>
            <p className="text-muted-foreground">{clientName}</p>
          </div>

          {/* Lista de vãos com checkboxes */}
          <div className="space-y-2">
            {/* Selecionar todos */}
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => {
                  if (v) setSelectedIds(new Set(items.map((i) => i.id)));
                  else setSelectedIds(new Set());
                }}
              />
              Todos os vãos
            </label>

            <div className="space-y-1.5 rounded-md border bg-muted/10 p-2">
              {items.map((item, index) => {
                const label = buildItemLabel(item, index, lookups);
                const checked = selectedIds.has(item.id);
                return (
                  <Label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="mt-px"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">
                        Vão {getVaoNumber(item, index)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {label}
                      </span>
                    </span>
                  </Label>
                );
              })}
            </div>
          </div>

          {noneSelected && (
            <p className="text-center text-xs text-destructive">
              Selecione ao menos um vão.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || noneSelected}
            >
              <Scissors className="mr-1.5 h-3.5 w-3.5" />
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
