"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { resolveUploadDisplayUrlAction } from "@/actions/upload-actions";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { DrawingBoard } from "@/components/field/drawing-board";
import { MeasurementPhotosSection } from "@/components/field/measurement-photos-section";
import { MeasurementItemSpecFields } from "@/components/field/measurement-item-spec-fields";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";
import { countItemPhotos } from "@/lib/measurement/item-photos";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type MeasurementItemCardProps = {
  item: MeasurementLineItem;
  index: number;
  lookups: MeasurementLookups;
  expanded: boolean;
  canRemove: boolean;
  disabled?: boolean;
  initialDrawingFullscreen?: boolean;
  onDrawingFullscreenApplied?: () => void;
  onDrawingFullscreenChange?: (fullscreen: boolean) => void;
  onChange: (item: MeasurementLineItem) => void;
  onRemove: () => void;
  onExpandedChange: (expanded: boolean) => void;
  onDrawingDirtyChange?: (dirty: boolean) => void;
  osId: string;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
};

export function MeasurementItemCard({
  item,
  index,
  lookups,
  expanded,
  canRemove,
  disabled,
  initialDrawingFullscreen = false,
  onDrawingFullscreenApplied,
  onDrawingFullscreenChange,
  onChange,
  onRemove,
  onExpandedChange,
  onDrawingDirtyChange,
  osId,
  pendingFiles = [],
  onPendingFilesChange,
}: MeasurementItemCardProps) {
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [resolvedDrawingUrl, setResolvedDrawingUrl] = useState<string | null>(
    item.drawingUrl ?? null,
  );

  useEffect(() => {
    if (!item.drawingUrl) {
      setResolvedDrawingUrl(null);
      return;
    }

    if (
      item.drawingUrl.startsWith("data:") ||
      item.drawingUrl.startsWith("/uploads/")
    ) {
      setResolvedDrawingUrl(item.drawingUrl);
      return;
    }

    let cancelled = false;
    void resolveUploadDisplayUrlAction(item.drawingUrl).then((resolved) => {
      if (!cancelled) setResolvedDrawingUrl(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [item.drawingUrl]);

  function updateField<K extends keyof MeasurementLineItem>(
    field: K,
    value: MeasurementLineItem[K],
  ) {
    onChange({ ...item, [field]: value });
  }

  const ambienteLabel = resolveLookupLabel(
    lookups.ambientes,
    item.idAmbiente ?? null,
  );

  const hasDimensions =
    Boolean(item.idAmbiente) ||
    item.qty > 0 ||
    item.largura > 0 ||
    item.altura > 0;
  const savedPhotoUrls = filterDisplayableUploadUrls(item.photos ?? []);
  const photoCount = countItemPhotos(item, pendingFiles.length);

  return (
    <article
      id={`measurement-item-${item.id}`}
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Medição {index + 1}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={disabled}
              aria-label={`Remover medição ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => onExpandedChange(!expanded)}
            disabled={disabled}
            aria-expanded={expanded}
            aria-controls={`measurement-item-body-${item.id}`}
            aria-label={
              expanded
                ? `Recolher medição ${index + 1}`
                : `Expandir medição ${index + 1}`
            }
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {!expanded && hasDimensions && (
        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {ambienteLabel ? (
            <p className="font-medium text-foreground">{ambienteLabel}</p>
          ) : null}
          <p className="tabular-nums">
            {item.qty > 0 ? `${item.qty} × ` : ""}
            {item.largura > 0 || item.altura > 0
              ? `${item.largura || "—"} × ${item.altura || "—"} mm`
              : null}
          </p>
          {item.observacao?.trim() ? (
            <p className="line-clamp-2 italic">{item.observacao.trim()}</p>
          ) : null}
          {photoCount > 0 ? (
            <p>
              {photoCount} foto{photoCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      )}

      {expanded && (
        <div
          id={`measurement-item-body-${item.id}`}
          className="mt-3 space-y-3"
        >
          <DrawingBoard
            key={resolvedDrawingUrl ?? item.id}
            initialImageUrl={resolvedDrawingUrl}
            initialFullscreen={initialDrawingFullscreen}
            onInitialFullscreenApplied={onDrawingFullscreenApplied}
            onFullscreenChange={onDrawingFullscreenChange}
            disabled={disabled}
            onDirtyChange={onDrawingDirtyChange}
            onSave={(base64Image) => updateField("drawingUrl", base64Image)}
          />
          <p className="text-xs text-muted-foreground">
            Desenhe no quadro e toque em{" "}
            <span className="font-medium">Salvar</span> na barra lateral antes de
            registrar a medição.
          </p>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="space-y-2">
              <Label htmlFor={`ambiente-${item.id}`}>Ambiente</Label>
              <Select
                id={`ambiente-${item.id}`}
                value={item.idAmbiente ?? ""}
                disabled={disabled}
                className="h-12 text-base"
                onChange={(e) =>
                  updateField("idAmbiente", e.target.value || null)
                }
              >
                <option value="">Selecione...</option>
                {lookups.ambientes.map((ambiente) => (
                  <option key={ambiente.id} value={ambiente.id}>
                    {ambiente.descricao}
                  </option>
                ))}
              </Select>
            </div>
            <h4 className="mt-4 text-sm font-medium">Dimensões (mm)</h4>
            <div className="mt-3 grid grid-cols-1 gap-4 min-[400px]:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`qty-${item.id}`}>Quantidade</Label>
                <Input
                  id={`qty-${item.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={item.qty === 0 ? "" : item.qty}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      updateField("qty", 0);
                      return;
                    }
                    const parsed = Number.parseInt(raw, 10);
                    if (!Number.isNaN(parsed)) {
                      updateField("qty", parsed);
                    }
                  }}
                  disabled={disabled}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`largura-${item.id}`}>Largura</Label>
                <Input
                  id={`largura-${item.id}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="ex: 1200"
                  value={item.largura || ""}
                  onChange={(e) =>
                    updateField("largura", Number(e.target.value) || 0)
                  }
                  disabled={disabled}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`altura-${item.id}`}>Altura</Label>
                <Input
                  id={`altura-${item.id}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="ex: 2100"
                  value={item.altura || ""}
                  onChange={(e) =>
                    updateField("altura", Number(e.target.value) || 0)
                  }
                  disabled={disabled}
                  className="h-12 text-base"
                />
              </div>
            </div>
            <MeasurementItemSpecFields
              lookups={lookups}
              itemId={item.id}
              values={{
                idCor: item.idCor ?? null,
                idTipoVidro: item.idTipoVidro ?? null,
                idTipoEnvidracamento: item.idTipoEnvidracamento ?? null,
              }}
              disabled={disabled}
              onChange={(specValues) =>
                onChange({
                  ...item,
                  ...specValues,
                })
              }
            />
            <div className="mt-4 space-y-2">
              <Label htmlFor={`observacao-${item.id}`}>Observação</Label>
              <Textarea
                id={`observacao-${item.id}`}
                rows={3}
                placeholder="Detalhes desta peça: recortes, nivelamento, impedimentos..."
                value={item.observacao ?? ""}
                onChange={(e) =>
                  updateField("observacao", e.target.value || undefined)
                }
                disabled={disabled}
                className="min-h-[80px] text-base"
              />
            </div>
          </div>

          <MeasurementPhotosSection
            expanded={photosExpanded}
            onExpandedChange={setPhotosExpanded}
            photoCount={photoCount}
          >
            <PhotoUpload
              hint="Fotos desta medição (ambiente, detalhes, referências)."
              osId={osId}
              scope="measurements"
              existingUrls={savedPhotoUrls}
              mode="form"
              disabled={disabled}
              showLabel={false}
              onUrlsChange={(urls) => updateField("photos", urls.length ? urls : undefined)}
              onFilesChange={onPendingFilesChange}
            />
          </MeasurementPhotosSection>
        </div>
      )}
    </article>
  );
}

export function createEmptyMeasurementItem(id: string): MeasurementLineItem {
  return {
    id,
    idAmbiente: null,
    qty: 0,
    largura: 0,
    altura: 0,
    idCor: null,
    idTipoVidro: null,
    idTipoEnvidracamento: null,
    drawingUrl: null,
    observacao: undefined,
    photos: undefined,
  };
}
