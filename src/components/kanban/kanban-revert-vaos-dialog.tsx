"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
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
import {
  listVaosForStageRevertAction,
  revertOSPhaseForVaosAction,
  type StageRevertVao,
} from "@/actions/stage-revert-actions";

export type KanbanRevertRequest = {
  osId: string;
  osNumber: string;
  clientName: string;
} | null;

type KanbanRevertVaosDialogProps = {
  pending: KanbanRevertRequest;
  onClose: () => void;
  /** Chamado após um retorno de etapa bem-sucedido, para atualizar o quadro. */
  onReverted: () => void;
};

export function KanbanRevertVaosDialog({
  pending,
  onClose,
  onReverted,
}: KanbanRevertVaosDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phaseLabel, setPhaseLabel] = useState<string | null>(null);
  const [previousPhaseLabel, setPreviousPhaseLabel] = useState<string | null>(null);
  const [vaos, setVaos] = useState<StageRevertVao[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const osId = pending?.osId ?? null;

  useEffect(() => {
    if (!osId) return;

    setIsLoading(true);
    setError(null);
    setVaos([]);
    setSelectedIds(new Set());

    let cancelled = false;

    listVaosForStageRevertAction(osId).then((result) => {
      if (cancelled) return;
      setIsLoading(false);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setPhaseLabel(result.phaseLabel);
      setPreviousPhaseLabel(result.previousPhaseLabel);
      setVaos(result.vaos);
    });

    return () => {
      cancelled = true;
    };
  }, [osId]);

  const toggleVao = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const handleConfirm = useCallback(() => {
    if (!osId || selectedIds.size === 0) return;
    setIsSubmitting(true);
    setError(null);

    revertOSPhaseForVaosAction({
      osId,
      itemIds: [...selectedIds],
    }).then((result) => {
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.message);
        return;
      }
      onReverted();
    });
  }, [osId, selectedIds, onReverted]);

  const allSelected = vaos.length > 0 && selectedIds.size === vaos.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="flex max-h-[min(640px,calc(100dvh-2rem))] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="shrink-0 space-y-4 px-6 pb-4 pt-6 pr-12">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" aria-hidden />
              Voltar etapa
            </DialogTitle>
            <DialogDescription>
              Selecione os vãos que devem voltar. O progresso registrado na
              etapa atual será apagado por completo nesses vãos, como se nada
              tivesse acontecido ainda.
            </DialogDescription>
          </DialogHeader>

          {pending && (
            <div className="min-w-0 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="truncate font-mono font-medium">{pending.osNumber}</p>
              <p className="truncate text-muted-foreground">{pending.clientName}</p>
            </div>
          )}

          {phaseLabel && previousPhaseLabel && (
            <div className="flex min-w-0 items-center gap-2 rounded-md border p-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-left">
                {phaseLabel}
              </span>
              <ArrowLeft className="h-4 w-4 shrink-0 text-warning-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-right font-medium">
                {previousPhaseLabel}
              </span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Carregando vãos…
            </div>
          ) : vaos.length > 0 ? (
            <div className="min-w-0 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/40">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => {
                    if (v) setSelectedIds(new Set(vaos.map((vao) => vao.id)));
                    else setSelectedIds(new Set());
                  }}
                  disabled={isSubmitting}
                />
                Todos os vãos
              </label>

              <div className="space-y-1.5 rounded-md border bg-muted/10 p-2">
                {vaos.map((vao) => {
                  const checked = selectedIds.has(vao.id);
                  return (
                    <Label
                      key={vao.id}
                      className="flex min-w-0 cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleVao(vao.id)}
                        disabled={isSubmitting}
                        className="mt-px shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold">
                          Vão {vao.vaoNumber}
                        </span>
                        <span className="block wrap-break-word text-xs text-muted-foreground">
                          {vao.label}
                        </span>
                        {vao.hasProgress && (
                          <span className="mt-1 inline-flex rounded-full bg-warning-subtle px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
                            será apagado
                          </span>
                        )}
                      </span>
                    </Label>
                  );
                })}
              </div>
            </div>
          ) : !error ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum vão encontrado nesta OS.
            </p>
          ) : null}

          {!isLoading && vaos.length > 0 && noneSelected && (
            <p className="pt-2 text-center text-xs text-destructive">
              Selecione ao menos um vão.
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t px-6 pb-6 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading || noneSelected}
          >
            {isSubmitting ? "Voltando…" : "Confirmar retorno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
