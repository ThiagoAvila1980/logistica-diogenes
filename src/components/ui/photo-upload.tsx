"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import { uploadPhotos } from "@/actions/upload-actions";
import { UPLOAD_MAX_FILES } from "@/lib/upload/config";
import type { UploadScope } from "@/lib/upload/config";
import { DrawingPreview } from "@/components/production/drawing-preview";
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
  /** Arquivos pendentes reidratados (ex.: blobs salvos offline no IndexedDB) */
  initialPendingFiles?: File[];
  maxFiles?: number;
  multiple?: boolean;
  /**
   * Origem das fotos: câmera, galeria/arquivos ou ambos (lado a lado).
   * @default "both"
   */
  sources?: "both" | "camera" | "files";
  /** @deprecated Use `sources`. Mantido para compatibilidade. */
  capture?: boolean;
  /**
   * form: arquivos vão no submit do formulário pai (name="photos")
   * instant: envia ao selecionar via Server Action
   */
  mode?: "form" | "instant";
  disabled?: boolean;
  showLabel?: boolean;
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
  initialPendingFiles,
  maxFiles = UPLOAD_MAX_FILES,
  multiple = true,
  sources: sourcesProp,
  capture,
  mode = "form",
  disabled,
  showLabel = true,
  onUrlsChange,
  onFilesChange,
  className,
}: PhotoUploadProps) {
  const sources =
    sourcesProp ?? (capture === false ? "files" : capture === true ? "camera" : "both");
  const showCamera = sources === "both" || sources === "camera";
  const showFiles = sources === "both" || sources === "files";
  const baseId = useId();
  const cameraInputId = `${baseId}-camera`;
  const filesInputId = `${baseId}-files`;
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PhotoUploadItem[]>(() =>
    existingUrls.map((url) => ({ id: url, url })),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onUrlsChangeRef = useRef(onUrlsChange);
  const onFilesChangeRef = useRef(onFilesChange);
  const lastNotifiedUrlsRef = useRef<string | null>(null);
  const lastNotifiedFilesRef = useRef<string | null>(null);
  const hydratedPendingRef = useRef(false);

  onUrlsChangeRef.current = onUrlsChange;
  onFilesChangeRef.current = onFilesChange;

  // Injeta arquivos pendentes reidratados (ex.: blobs offline do IndexedDB)
  // assim que chegarem — só uma vez, para não reaparecer após o usuário remover.
  useEffect(() => {
    if (hydratedPendingRef.current) return;
    if (!initialPendingFiles?.length) return;
    hydratedPendingRef.current = true;

    setItems((prev) => {
      const pending: PhotoUploadItem[] = initialPendingFiles.map((file) => {
        const preview = URL.createObjectURL(file);
        return { id: newId(), url: preview, preview, file };
      });
      return [...prev, ...pending].slice(0, maxFiles);
    });
  }, [initialPendingFiles, maxFiles]);

  useEffect(() => {
    setItems((prev) => {
      const pending = prev.filter((i) => i.file);
      const saved = existingUrls.map((url) => {
        const found = prev.find((p) => p.url === url && !p.file);
        return found ?? { id: url, url };
      });
      const next = [...saved, ...pending].slice(0, maxFiles);
      if (
        next.length === prev.length &&
        next.every(
          (item, index) =>
            item.id === prev[index]?.id &&
            item.url === prev[index]?.url &&
            item.file === prev[index]?.file,
        )
      ) {
        return prev;
      }
      return next;
    });
  }, [existingUrls.join("|"), maxFiles]);

  useEffect(() => {
    const urls = items.filter((i) => !i.file).map((i) => i.url);
    const files = items.filter((i) => i.file).map((i) => i.file!);
    const urlsKey = urls.join("|");
    const filesKey = files
      .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
      .join("|");

    if (lastNotifiedUrlsRef.current !== urlsKey) {
      lastNotifiedUrlsRef.current = urlsKey;
      onUrlsChangeRef.current?.(urls);
    }
    if (lastNotifiedFilesRef.current !== filesKey) {
      lastNotifiedFilesRef.current = filesKey;
      onFilesChangeRef.current?.(files);
    }
  }, [items]);

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
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (filesInputRef.current) filesInputRef.current.value = "";
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
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  const pickerDisabled = disabled || uploading;
  const pickerZoneClass = cn(
    "flex min-h-[100px] flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 transition-colors",
    pickerDisabled && "pointer-events-none opacity-50",
    !pickerDisabled &&
      "hover:border-primary/50 hover:bg-muted/50 active:scale-[0.99]",
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          {showLabel && <p className="text-sm font-medium">{label}</p>}
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
          {items.map((item, index) => (
            <li key={item.id} className="relative">
              <DrawingPreview
                src={item.preview ?? item.url}
                alt={`Foto ${index + 1}`}
                variant="thumbnail"
              />
              <button
                type="button"
                className="absolute right-1 top-1 z-10 rounded-full bg-overlay/60 p-1 text-primary-foreground hover:bg-overlay/80"
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
        <div
          className={cn(
            "flex flex-col gap-2",
            showCamera && showFiles && "sm:flex-row",
          )}
        >
          {showCamera && (
            <label htmlFor={cameraInputId} className={pickerZoneClass}>
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Camera className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-center text-sm font-medium">
                {uploading ? "Enviando..." : "Câmera"}
              </span>
              <span className="text-center text-xs text-muted-foreground">
                Tirar foto agora
              </span>
              <input
                ref={cameraInputRef}
                id={cameraInputId}
                type="file"
                accept="image/*"
                capture="environment"
                multiple={multiple}
                className="sr-only"
                disabled={pickerDisabled}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}

          {showFiles && (
            <label htmlFor={filesInputId} className={pickerZoneClass}>
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-center text-sm font-medium">
                {uploading ? "Enviando..." : "Galeria ou arquivos"}
              </span>
              <span className="text-center text-xs text-muted-foreground">
                Escolher imagens já salvas (JPG, PNG ou WebP)
              </span>
              <input
                ref={filesInputRef}
                id={filesInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                multiple={multiple}
                className="sr-only"
                disabled={pickerDisabled}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      )}

      {items.length < maxFiles && showCamera && showFiles && (
        <p className="text-center text-xs text-muted-foreground">
          As imagens são convertidas para WebP ao salvar a medição.
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
