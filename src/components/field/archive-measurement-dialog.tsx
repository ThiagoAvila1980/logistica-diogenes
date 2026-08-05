"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { archiveMeasurement } from "@/actions/field-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ArchiveMeasurementDialogProps = {
  osId: string;
  displayNumber: string;
  clientName: string;
};

export function ArchiveMeasurementDialog({
  osId,
  displayNumber,
  clientName,
}: ArchiveMeasurementDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveMeasurement(osId);
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
        aria-label="Arquivar medição"
        title="Arquivar para consulta futura"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Archive className={iconClass} />
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
            <DialogTitle>Arquivar medição?</DialogTitle>
            <DialogDescription>
              A OS {displayNumber} deixará de aparecer na lista ativa e ficará
              disponível em Arquivadas. Nenhum dado ou arquivo (fotos,
              desenhos e PDF) é excluído.
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
              onClick={handleArchive}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Arquivando...
                </>
              ) : (
                "Arquivar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
