"use client";

import { useId, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageIcon, Loader2, Plus, X } from "lucide-react";
import type { StepCompletionMeta } from "@/lib/audit/format-step-audit";
import { completeInstallationStepWithPhotosAction } from "@/actions/installation-step-actions";
import { StepAuditTooltip } from "@/components/audit/step-audit-hint";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { compressPhotosToJpegFiles } from "@/lib/offline/photo-compress";
import type { InstallationChecklistStep } from "@/lib/workflow/schemas";

const MAX_STEP_PHOTOS = 8;

type PendingPhoto = {
  id: string;
  file: File;
  preview: string;
};

type Props = {
  osId: string;
  itemId: string;
  step: InstallationChecklistStep;
  stepLabel: string;
  vaoNumber: number;
  done: boolean;
  photoUrls?: string[];
  auditMeta?: StepCompletionMeta;
  onCompleted: (photoUrls: string[]) => void;
  onError: (message: string | null) => void;
};

function newPendingId() {
  return `pending-${Math.random().toString(36).slice(2, 9)}`;
}

export function InstallationStepPhotoButton({
  osId,
  itemId,
  step,
  stepLabel,
  vaoNumber,
  done,
  photoUrls = [],
  auditMeta,
  onCompleted,
  onError,
}: Props) {
  const baseId = useId();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const aria = `${stepLabel} — Vão ${vaoNumber}`;
  const hasSavedPhotos = photoUrls.length > 0;

  function resetPreview() {
    setPending((prev) => {
      for (const item of prev) URL.revokeObjectURL(item.preview);
      return [];
    });
    setPreviewOpen(false);
    setProcessing(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (filesInputRef.current) filesInputRef.current.value = "";
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    setMenuOpen(false);
    onError(null);
    setProcessing(true);
    try {
      const incoming = Array.from(fileList);
      const prepared = await compressPhotosToJpegFiles(incoming);
      setPending((prev) => {
        const slotsLeft = MAX_STEP_PHOTOS - prev.length;
        const batch = prepared.slice(0, Math.max(0, slotsLeft)).map((file) => ({
          id: newPendingId(),
          file,
          preview: URL.createObjectURL(file),
        }));
        return [...prev, ...batch];
      });
      setPreviewOpen(true);
    } catch {
      onError("Não foi possível processar as fotos selecionadas.");
    } finally {
      setProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (filesInputRef.current) filesInputRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (pending.length === 0) return;
    setSubmitting(true);
    onError(null);

    const fd = new FormData();
    fd.set("osId", osId);
    fd.set("itemId", itemId);
    fd.set("step", step);
    for (const item of pending) {
      fd.append("photos", item.file);
    }

    let result: Awaited<
      ReturnType<typeof completeInstallationStepWithPhotosAction>
    > | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await completeInstallationStepWithPhotosAction(fd);
        break;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
      }
    }

    setSubmitting(false);

    if (!result) {
      onError("Falha de conexão. Verifique sua internet e tente novamente.");
      return;
    }
    if (!result.success) {
      onError(result.message);
      return;
    }

    onCompleted(result.photoUrls);
    resetPreview();
  }

  const fileInputs = (
    <>
      <input
        ref={cameraInputRef}
        id={`${baseId}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <input
        ref={filesInputRef}
        id={`${baseId}-files`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </>
  );

  const addMenuItems = (
    <>
      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
        <label
          htmlFor={`${baseId}-camera`}
          className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5"
        >
          <Camera className="h-4 w-4" />
          Tirar foto
        </label>
      </DropdownMenuItem>
      <DropdownMenuItem className="p-0" onSelect={(e) => e.preventDefault()}>
        <label
          htmlFor={`${baseId}-files`}
          className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5"
        >
          <ImageIcon className="h-4 w-4" />
          Upload
        </label>
      </DropdownMenuItem>
    </>
  );

  if (done) {
    const check = (
      <CheckCircle2 className="h-4 w-4 text-success" aria-label={aria} />
    );
    return (
      <>
        <StepAuditTooltip meta={auditMeta}>
          {hasSavedPhotos ? (
            <button
              type="button"
              className="inline-flex rounded-full p-0.5 hover:bg-success-muted"
              onClick={() => setViewOpen(true)}
              aria-label={`Ver fotos — ${aria}`}
            >
              {check}
            </button>
          ) : (
            check
          )}
        </StepAuditTooltip>
        {hasSavedPhotos ? (
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>{stepLabel}</DialogTitle>
                <DialogDescription>
                  Vão {vaoNumber} — {photoUrls.length}{" "}
                  {photoUrls.length === 1 ? "foto" : "fotos"}
                </DialogDescription>
              </DialogHeader>
              <ul className="grid grid-cols-2 gap-2">
                {photoUrls.map((url, index) => (
                  <li key={`${url}-${index}`}>
                    <ResolvedImage
                      src={url}
                      alt={`Foto ${index + 1} de ${stepLabel} — Vão ${vaoNumber}`}
                      className="h-28 w-full rounded-md object-cover"
                    />
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    );
  }

  const canAddMore = pending.length < MAX_STEP_PHOTOS;

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {fileInputs}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={processing || submitting}
            aria-label={`Adicionar foto — ${aria}`}
          >
            {processing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-44">
          {addMenuItems}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open && !submitting) resetPreview();
        }}
      >
        <DialogContent
          className="max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Confirmar {stepLabel.toLowerCase()}</DialogTitle>
            <DialogDescription>
              Envie ao menos uma foto para concluir esta etapa do vão {vaoNumber}.
              Você pode adicionar várias.
            </DialogDescription>
          </DialogHeader>

          {pending.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2">
              {pending.map((item, index) => (
                <li key={item.id} className="relative">
                  <img
                    src={item.preview}
                    alt={`Prévia ${index + 1} — ${aria}`}
                    className="h-28 w-full rounded-md object-cover bg-muted"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-overlay/60 p-1 text-primary-foreground hover:bg-overlay/80"
                    onClick={() => removePending(item.id)}
                    disabled={submitting}
                    aria-label={`Remover foto ${index + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma foto selecionada ainda.
            </p>
          )}

          {canAddMore ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={submitting || processing}>
                  {processing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Adicionar foto
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {addMenuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <p className="text-xs text-muted-foreground">
              Máximo de {MAX_STEP_PHOTOS} fotos nesta etapa.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetPreview}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={pending.length === 0 || submitting}
            >
              {submitting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
