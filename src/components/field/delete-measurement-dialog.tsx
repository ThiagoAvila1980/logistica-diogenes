"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteMeasurement } from "@/actions/field-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteMeasurementDialogProps = {
  osId: string;
  displayNumber: string;
  clientName: string;
  /** Rota após exclusão bem-sucedida (padrão: lista de medições). */
  redirectHref?: string;
};

export function DeleteMeasurementDialog({
  osId,
  displayNumber,
  clientName,
  redirectHref = "/field",
}: DeleteMeasurementDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMeasurement(osId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.push(redirectHref);
      router.refresh();
    });
  }

  const buttonClass =
    "h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive";

  const iconClass = "h-4 w-4";

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        aria-label="Excluir medição"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 className={iconClass} />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isPending) {
            setOpen(next);
            if (!next) setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir medição?</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. Serão removidos a OS {displayNumber}, todos
              os registros no banco e os arquivos (fotos, desenhos e PDF) no
              storage.
            </DialogDescription>
          </DialogHeader>

          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium">{clientName}</span>
            <span className="text-muted-foreground"> · {displayNumber}</span>
          </p>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
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
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir permanentemente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
