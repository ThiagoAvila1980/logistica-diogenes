"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { AdminActionResult } from "@/actions/vehicle-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteRecordDialogProps = {
  recordName: string;
  recordDetail?: string;
  entityLabel: string;
  description?: string;
  disabled?: boolean;
  onConfirm: () => Promise<AdminActionResult>;
};

export function DeleteRecordDialog({
  recordName,
  recordDetail,
  entityLabel,
  description = "Esta ação é permanente. O registro será removido do sistema.",
  disabled,
  onConfirm,
}: DeleteRecordDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.success) {
        setError(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={disabled || isPending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label={`Excluir ${entityLabel}`}
      >
        <Trash2 className="h-4 w-4" />
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
            <DialogTitle>Excluir {entityLabel}?</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium">{recordName}</span>
            {recordDetail ? (
              <span className="block text-muted-foreground">{recordDetail}</span>
            ) : null}
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
