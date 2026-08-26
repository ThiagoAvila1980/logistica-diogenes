"use client";

import { useId, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";
import type { StepCompletionMeta } from "@/lib/audit/format-step-audit";
import { completeCuttingStepWithPhotoAction } from "@/actions/cutting-actions";
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
import { compressPhotoToJpegFile } from "@/lib/offline/photo-compress";
import type { CuttingChecklistStep } from "@/lib/workflow/schemas";

type Props = {
  osId: string;
  itemId: string;
  step: CuttingChecklistStep;
  stepLabel: string;
  vaoNumber: number;
  done: boolean;
  photoUrl?: string;
  auditMeta?: StepCompletionMeta;
  onCompleted: (photoUrl: string) => void;
  onError: (message: string | null) => void;
};

export function CuttingStepPhotoButton({
  osId,
  itemId,
  step,
  stepLabel,
  vaoNumber,
  done,
  photoUrl,
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const aria = `${stepLabel} — Vão ${vaoNumber}`;

  function resetPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
    setPreviewOpen(false);
    setProcessing(false);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (filesInputRef.current) filesInputRef.current.value = "";
  }

  async function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setMenuOpen(false);
    onError(null);
    setProcessing(true);
    try {
      const prepared = await compressPhotoToJpegFile(file);
      const nextPreview = URL.createObjectURL(prepared);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewFile(prepared);
      setPreviewUrl(nextPreview);
      setPreviewOpen(true);
    } catch {
      onError("Não foi possível processar a foto selecionada.");
    } finally {
      setProcessing(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (filesInputRef.current) filesInputRef.current.value = "";
    }
  }

  async function handleConfirm() {
    if (!previewFile) return;
    setSubmitting(true);
    onError(null);

    const fd = new FormData();
    fd.set("osId", osId);
    fd.set("itemId", itemId);
    fd.set("step", step);
    fd.append("photos", previewFile);

    let result: Awaited<
      ReturnType<typeof completeCuttingStepWithPhotoAction>
    > | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await completeCuttingStepWithPhotoAction(fd);
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

    onCompleted(result.photoUrl);
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
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </>
  );

  if (done) {
    const check = (
      <CheckCircle2 className="h-4 w-4 text-success" aria-label={aria} />
    );
    return (
      <>
        <StepAuditTooltip meta={auditMeta}>
          {photoUrl ? (
            <button
              type="button"
              className="inline-flex rounded-full p-0.5 hover:bg-success-muted"
              onClick={() => setViewOpen(true)}
              aria-label={`Ver foto — ${aria}`}
            >
              {check}
            </button>
          ) : (
            check
          )}
        </StepAuditTooltip>
        {photoUrl ? (
          <Dialog open={viewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>{stepLabel}</DialogTitle>
                <DialogDescription>Vão {vaoNumber}</DialogDescription>
              </DialogHeader>
              <ResolvedImage
                src={photoUrl}
                alt={`Foto de ${stepLabel} — Vão ${vaoNumber}`}
                className="max-h-80 w-full rounded-md object-contain"
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </>
    );
  }

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
          <DropdownMenuItem
            className="p-0"
            onSelect={(e) => e.preventDefault()}
          >
            <label
              htmlFor={`${baseId}-camera`}
              className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5"
            >
              <Camera className="h-4 w-4" />
              Tirar foto
            </label>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="p-0"
            onSelect={(e) => e.preventDefault()}
          >
            <label
              htmlFor={`${baseId}-files`}
              className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5"
            >
              <ImageIcon className="h-4 w-4" />
              Upload
            </label>
          </DropdownMenuItem>
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
              Envie a foto para concluir esta etapa do vão {vaoNumber}.
            </DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`Prévia — ${aria}`}
              className="max-h-72 w-full rounded-md object-contain bg-muted"
            />
          ) : null}
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
              disabled={!previewFile || submitting}
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
