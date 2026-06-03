"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CatalogImageUploadProps = {
  label?: string;
  hint?: string;
  existingUrl?: string | null;
  disabled?: boolean;
  /** Nome do campo file no FormData */
  name?: string;
  className?: string;
};

export function CatalogImageUpload({
  label = "Imagem",
  hint = "JPEG, PNG ou WebP. Será convertida para WebP ao salvar.",
  existingUrl,
  disabled,
  name = "imagem",
  className,
}: CatalogImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function revokePreview() {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  function clearSelection() {
    revokePreview();
    setPreviewUrl(null);
    setSelectedName(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleFileChange(file: File | undefined) {
    if (!file) {
      clearSelection();
      return;
    }
    revokePreview();
    setSelectedName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveExisting(false);
  }

  const showExisting =
    Boolean(existingUrl) && !removeExisting && !previewUrl;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {showExisting && existingUrl && (
        <div className="relative inline-block max-w-full">
          <ResolvedImage
            src={existingUrl}
            alt=""
            className="max-h-40 w-auto max-w-full rounded-lg border object-contain"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            disabled={disabled}
            onClick={() => {
              setRemoveExisting(true);
              clearSelection();
            }}
            aria-label="Remover imagem atual"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {previewUrl && (
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="max-h-40 w-auto max-w-full rounded-lg border object-contain"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            disabled={disabled}
            onClick={clearSelection}
            aria-label="Cancelar nova imagem"
          >
            <X className="h-4 w-4" />
          </Button>
          {selectedName && (
            <p className="mt-1 text-xs text-muted-foreground">{selectedName}</p>
          )}
        </div>
      )}

      {showExisting && existingUrl && (
        <input type="hidden" name="existingImagemUrl" value={existingUrl} />
      )}
      {removeExisting && <input type="hidden" name="removeImagem" value="1" />}

      <div>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          {showExisting || previewUrl ? "Trocar imagem" : "Enviar imagem"}
        </Button>
      </div>
    </div>
  );
}
