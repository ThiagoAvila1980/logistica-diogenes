"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, Loader2 } from "lucide-react";
import { unarchiveMeasurement } from "@/actions/field-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UnarchiveMeasurementDialogProps = {
  osId: string;
  displayNumber: string;
  clientName: string;
};

export function UnarchiveMeasurementDialog({
  osId,
  displayNumber,
  clientName,
}: UnarchiveMeasurementDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUnarchive() {
    setError(null);
    startTransition(async () => {
      const result = await unarchiveMeasurement(osId);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const buttonClass =
    "h-9 w-9 shrink-0 text-muted-foreground hover:bg-primary/5 hover:text-primary";

  const iconClass = "h-4 w-4";

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={buttonClass}
        aria-label="Desarquivar medição"
        title="Desarquivar e voltar à lista ativa"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <ArchiveRestore className={iconClass} />
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
            <DialogTitle>Desarquivar medição?</DialogTitle>
            <DialogDescription>
              A OS {displayNumber} voltará a aparecer na lista ativa e sairá de
              Arquivadas.
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
            <Button type="button" onClick={handleUnarchive} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desarquivando...
                </>
              ) : (
                "Desarquivar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
