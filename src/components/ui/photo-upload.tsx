"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { uploadPhotos } from "@/actions/upload-actions";
import { UPLOAD_MAX_FILES } from "@/lib/upload/config";
import type { UploadScope } from "@/lib/upload/config";
import { cn } from "@/lib/utils";

export type PhotoUploadItem = {
  id: string;
  url: string;
  file?: File;
  /** URL local (blob) para preview antes do upload */
  preview?: string;
};

type PhotoUploadProps = {
  label?: string;
  hint?: string;
  osId: string;
  scope: UploadScope;
  /** URLs já salvas no servidor */
  existingUrls?: string[];
  maxFiles?: number;
  multiple?: boolean;
  capture?: boolean;
  /**
   * form: arquivos vão no submit do formulário pai (name="photos")
   * instant: envia ao selecionar via Server Action
   */
  mode?: "form" | "instant";
  disabled?: boolean;
  onUrlsChange?: (urls: string[]) => void;
  onFilesChange?: (files: File[]) => void;
  className?: string;
};

function newId() {
  return `photo-${Math.random().toString(36).slice(2, 9)}`;
}

export function PhotoUpload({
  label = "Fotos",
  hint,
  osId,
  scope,
  existingUrls = [],
  maxFiles = UPLOAD_MAX_FILES,
  multiple = true,
  capture = true,
  mode = "form",
  disabled,
  onUrlsChange,
  onFilesChange,
  className,
}: PhotoUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PhotoUploadItem[]>(() =>
    existingUrls.map((url) => ({ id: url, url })),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems((prev) => {
      const pending = prev.filter((i) => i.file);
      const saved = existingUrls.map((url) => {
        const found = prev.find((p) => p.url === url && !p.file);
        return found ?? { id: url, url };
      });
      return [...saved, ...pending].slice(0, maxFiles);
    });
  }, [existingUrls.join("|"), maxFiles]);

  useEffect(() => {
    onUrlsChange?.(items.filter((i) => !i.file).map((i) => i.url));
    onFilesChange?.(items.filter((i) => i.file).map((i) => i.file!));
  }, [items, onUrlsChange, onFilesChange]);

  const syncItems = useCallback((next: PhotoUploadItem[]) => {
    setItems(next.slice(0, maxFiles));
  }, [maxFiles]);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length || disabled || uploading) return;
    setError(null);

    const incoming = Array.from(fileList);
    const slotsLeft = maxFiles - items.length;
    if (slotsLeft <= 0) {
      setError(`Máximo de ${maxFiles} fotos`);
      return;
    }

    const batch = incoming.slice(0, slotsLeft);

    if (mode === "instant") {
      setUploading(true);
      const fd = new FormData();
      fd.set("osId", osId);
      fd.set("scope", scope);
      batch.forEach((f) => fd.append("photos", f));

      const res = await uploadPhotos(fd);
      setUploading(false);

      if (!res.success) {
        setError(res.message);
        return;
      }

      const uploaded: PhotoUploadItem[] = res.urls.map((url) => ({
        id: newId(),
        url,
      }));
      syncItems([...items, ...uploaded]);
      if (res.warnings?.length) {
        setError(res.warnings.join("; "));
      }
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const pending: PhotoUploadItem[] = batch.map((file) => {
      const preview = URL.createObjectURL(file);
      return {
        id: newId(),
        url: preview,
        preview,
        file,
      };
    });

    syncItems([...items, ...pending]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length}/{maxFiles}
        </span>
      </div>

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview ?? item.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                onClick={() => removeItem(item.id)}
                disabled={disabled || uploading}
                aria-label="Remover foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.length < maxFiles && (
        <label
          htmlFor={inputId}
          className={cn(
            "flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 transition-colors",
            (disabled || uploading) && "pointer-events-none opacity-50",
            !disabled && "hover:border-primary/50 hover:bg-muted/50 active:scale-[0.99]",
          )}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-center text-sm font-medium">
            {uploading ? "Enviando..." : "Toque para adicionar fotos"}
          </span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG ou WebP (convertidas para WebP ao salvar)
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/*"
            capture={capture ? "environment" : undefined}
            multiple={multiple}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
