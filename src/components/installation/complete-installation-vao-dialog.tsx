"use client";

import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CompleteInstallationVaoDialogProps = {
  open: boolean;
  vaoLabel: string;
  vaoSpec?: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function CompleteInstallationVaoDialog({
  open,
  vaoLabel,
  vaoSpec,
  isSubmitting,
  onConfirm,
  onCancel,
}: CompleteInstallationVaoDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar conclusão do vão</DialogTitle>
          <DialogDescription>
            Todas as fases foram registradas. Confirme para enviar este vão para
            concluídos.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-semibold">{vaoLabel}</p>
          {vaoSpec ? (
            <p className="mt-0.5 text-muted-foreground">{vaoSpec}</p>
          ) : null}
        </div>

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
            <BadgeCheck className="mr-2 h-4 w-4" />
            {isSubmitting ? "Confirmando…" : "Concluir vão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
