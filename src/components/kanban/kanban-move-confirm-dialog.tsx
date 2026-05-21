"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { OsStatus } from "@/db/schema";

export type KanbanPendingMove = {
  osId: string;
  osNumber: string;
  clientName: string;
  sourceStatus: OsStatus;
  destStatus: OsStatus;
  destPhaseId: string;
  destIndex?: number;
};

type KanbanMoveConfirmDialogProps = {
  pending: KanbanPendingMove | null;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function KanbanMoveConfirmDialog({
  pending,
  isSubmitting,
  onConfirm,
  onCancel,
}: KanbanMoveConfirmDialogProps) {
  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar mudança de fase</DialogTitle>
          <DialogDescription>
            Revise os dados antes de mover a ordem de serviço no fluxo.
          </DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="font-mono font-medium">{pending.osNumber}</p>
              <p className="text-muted-foreground">{pending.clientName}</p>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3">
              <span className="min-w-0 flex-1 truncate text-left">
                {STATUS_LABELS[pending.sourceStatus]}
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-right font-medium">
                {STATUS_LABELS[pending.destStatus]}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Movendo…" : "Confirmar movimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
