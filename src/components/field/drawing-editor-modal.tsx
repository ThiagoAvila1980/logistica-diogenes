"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { DrawingBoard } from "@/components/field/drawing-board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DrawingEditorModalProps = {
  drawingId: string;
  drawingNumber: number;
  isNew: boolean;
  initialImageUrl: string | null;
  imageLoading?: boolean;
  templateImageUrl?: string | null;
  templateKey?: number;
  isDirty: boolean;
  disabled?: boolean;
  /** Título do cabeçalho (padrão: Novo desenho / Desenho N). */
  title?: string;
  onSave: (base64: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
};

export function DrawingEditorModal({
  drawingId,
  drawingNumber,
  isNew,
  initialImageUrl,
  imageLoading,
  templateImageUrl,
  templateKey,
  isDirty,
  disabled,
  title: titleProp,
  onSave,
  onDirtyChange,
  onClose,
}: DrawingEditorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  function handleClose() {
    if (isDirty) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }

  function handleConfirmDiscard() {
    setConfirmOpen(false);
    onClose();
  }

  const title =
    titleProp ?? (isNew ? "Novo desenho" : `Desenho ${drawingNumber}`);

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[200] flex flex-col bg-background"
    >
      <div className="flex shrink-0 items-center gap-2 border-b bg-background px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleClose}
          aria-label="Fechar editor de desenho"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="flex-1 truncate text-sm font-medium">{title}</span>
        {isDirty && (
          <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning-foreground">
            Não salvo
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {imageLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Carregando desenho…
          </div>
        ) : (
          <DrawingBoard
            key={`${drawingId}:${initialImageUrl ?? "new"}`}
            fill
            initialImageUrl={initialImageUrl}
            templateImageUrl={templateImageUrl}
            templateKey={templateKey}
            disabled={disabled}
            onSave={onSave}
            onDirtyChange={onDirtyChange}
          />
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return (
    <>
      {createPortal(modal, document.body)}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="z-[250] max-w-sm">
          <DialogHeader>
            <DialogTitle>Fechar sem salvar?</DialogTitle>
            <DialogDescription>
              O desenho tem alterações não salvas. Se fechar agora, as alterações serão perdidas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDiscard}
            >
              Fechar sem salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
