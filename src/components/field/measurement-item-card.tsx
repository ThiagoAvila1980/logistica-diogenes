"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { resolveUploadDisplayUrlAction } from "@/actions/upload-actions";
import type { DrawingItem, MeasurementLineItem } from "@/lib/workflow/schemas";
import { MultiDrawingSection } from "@/components/field/multi-drawing-section";
import { MeasurementPhotosSection } from "@/components/field/measurement-photos-section";
import { MeasurementItemSpecFields } from "@/components/field/measurement-item-spec-fields";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";
import { countItemPhotos } from "@/lib/measurement/item-photos";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import { MeasurementDimensionsFields } from "@/components/field/measurement-dimensions-fields";
import {
  formatDimensionsSummary,
  hasAnyDimensionValue,
} from "@/lib/measurement/dimensions";
import { getVaoNumber } from "@/lib/measurement/vao-item-subtitle";
import { Button } from "@/components/ui/button";
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
  /** @deprecated não usado — mantido para compatibilidade com o formulário */
  initialDrawingFullscreen?: boolean;
  /** @deprecated não usado — mantido para compatibilidade com o formulário */
  onDrawingFullscreenApplied?: () => void;
  /** @deprecated não usado — mantido para compatibilidade com o formulário */
  onDrawingFullscreenChange?: (fullscreen: boolean) => void;
  onChange: (item: MeasurementLineItem) => void;
  onRemove: () => void;
  onExpandedChange: (expanded: boolean) => void;
  onDrawingDirtyChange?: (dirty: boolean) => void;
  initialActiveDrawingId?: string | null;
  onInitialActiveDrawingApplied?: () => void;
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
  onChange,
  onRemove,
  onExpandedChange,
  onDrawingDirtyChange,
  initialActiveDrawingId,
  onInitialActiveDrawingApplied,
  osId,
  pendingFiles = [],
  onPendingFilesChange,
}: MeasurementItemCardProps) {
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [resolvedTemplateUrl, setResolvedTemplateUrl] = useState<string | null>(
    null,
  );
  const [templateKey, setTemplateKey] = useState(0);
  const prevTipoEnvidracamentoRef = useRef(item.idTipoEnvidracamento);

  const selectedTipoEnvidracamento = lookups.tipoEnvidracamento.find(
    (tipo) => tipo.id === item.idTipoEnvidracamento,
  );

  function handleDrawingsChange(newDrawings: DrawingItem[]) {
    onChange({
      ...item,
      drawings: newDrawings,
      // Mantém drawingUrl para compatibilidade com código legado (produção/corte)
      drawingUrl: newDrawings[0]?.url ?? null,
    });
  }

  useEffect(() => {
    const imagemUrl = selectedTipoEnvidracamento?.imagemUrl;
    if (!imagemUrl) {
      setResolvedTemplateUrl(null);
      return;
    }

    if (imagemUrl.startsWith("data:") || imagemUrl.startsWith("/uploads/")) {
      setResolvedTemplateUrl(imagemUrl);
      return;
    }

    let cancelled = false;
    void resolveUploadDisplayUrlAction(imagemUrl).then((resolved) => {
      if (!cancelled) setResolvedTemplateUrl(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedTipoEnvidracamento?.imagemUrl, item.idTipoEnvidracamento]);

  useEffect(() => {
    const prev = prevTipoEnvidracamentoRef.current;
    const next = item.idTipoEnvidracamento;
    if (prev === next) return;
    prevTipoEnvidracamentoRef.current = next;
    if (next && resolvedTemplateUrl) {
      setTemplateKey((key) => key + 1);
    }
  }, [item.idTipoEnvidracamento, resolvedTemplateUrl]);

  // templateImageUrl é repassado sempre que disponível; a decisão de carregar
  // no canvas fica a cargo do MultiDrawingSection (novo vs. existente).
  const hasTemplate = Boolean(item.idTipoEnvidracamento && resolvedTemplateUrl);

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
    Boolean(item.idAmbiente) || item.qty > 0 || hasAnyDimensionValue(item);
  const dimensionsSummary = formatDimensionsSummary(item);
  const savedPhotoUrls = filterDisplayableUploadUrls(item.photos ?? []);
  const photoCount = countItemPhotos(item, pendingFiles.length);
  const vaoNumber = getVaoNumber(item, index);

  return (
    <article
      id={`measurement-item-${item.id}`}
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Medição {vaoNumber}</h3>
        <div className="flex shrink-0 items-center gap-1">
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={disabled}
              aria-label={`Remover medição ${vaoNumber}`}
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
                ? `Recolher medição ${vaoNumber}`
                : `Expandir medição ${vaoNumber}`
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
          {dimensionsSummary ? (
            <p className="tabular-nums">{dimensionsSummary}</p>
          ) : null}
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
            <MeasurementDimensionsFields
              item={item}
              disabled={disabled}
              onChange={onChange}
            />
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

          <MultiDrawingSection
            drawings={item.drawings ?? []}
            legacyDrawingUrl={item.drawingUrl}
            templateImageUrl={hasTemplate ? resolvedTemplateUrl : null}
            templateKey={templateKey}
            disabled={disabled}
            initialActiveDrawingId={initialActiveDrawingId}
            onInitialActiveDrawingApplied={onInitialActiveDrawingApplied}
            onDirtyChange={onDrawingDirtyChange}
            onDrawingsChange={handleDrawingsChange}
          />
          {selectedTipoEnvidracamento?.imagemUrl && (
            <p className="text-xs text-muted-foreground">
              Ao escolher o tipo de envidraçamento, a imagem de referência é
              carregada no primeiro desenho.
            </p>
          )}

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
              initialPendingFiles={pendingFiles}
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
    drawings: [],
    observacao: undefined,
    photos: undefined,
  };
}
