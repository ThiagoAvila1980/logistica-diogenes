"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { MeasurementItemSpecSummary } from "@/components/field/measurement-item-spec-fields";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { Button } from "@/components/ui/button";
import { MeasurementPhotosSection } from "@/components/field/measurement-photos-section";
import { MeasurementDimensionsDisplay } from "@/components/field/measurement-dimensions-display";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";
import { countItemPhotos } from "@/lib/measurement/item-photos";
import {
  formatDimensionsSummary,
  hasAnyDimensionValue,
  hasValidItemDimensions,
} from "@/lib/measurement/dimensions";

type MeasurementItemViewProps = {
  item: MeasurementLineItem;
  index: number;
  lookups?: MeasurementLookups;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function MeasurementItemView({
  item,
  index,
  lookups,
  expanded,
  onExpandedChange,
}: MeasurementItemViewProps) {
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const photoUrls = filterDisplayableUploadUrls(item.photos ?? []);
  const photoCount = countItemPhotos(item);

  // Suporte a múltiplos desenhos (drawings[]) com fallback para drawingUrl legado
  const allDrawings =
    item.drawings && item.drawings.length > 0
      ? item.drawings
      : item.drawingUrl
        ? [{ id: "__legacy__", url: item.drawingUrl }]
        : [];
  const ambienteLabel = resolveLookupLabel(
    lookups?.ambientes ?? [],
    item.idAmbiente ?? null,
  );
  const hasDimensions =
    Boolean(item.idAmbiente) || item.qty > 0 || hasAnyDimensionValue(item);
  const dimensionsSummary = formatDimensionsSummary(item);

  return (
    <article
      id={`measurement-item-${item.id}`}
      className="rounded-xl border bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Medição {index + 1}</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onExpandedChange(!expanded)}
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

      {!expanded && hasDimensions && (
        <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
          {ambienteLabel ? (
            <p className="font-medium text-foreground">{ambienteLabel}</p>
          ) : null}
          {dimensionsSummary ? (
            <p className="tabular-nums">{dimensionsSummary}</p>
          ) : null}
          <MeasurementItemSpecSummary item={item} lookups={lookups} />
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
          {allDrawings.length > 0 ? (
            <div className="space-y-2">
              {allDrawings.map((drawing, dIdx) => (
                <div
                  key={drawing.id}
                  className="overflow-hidden rounded-lg border bg-card"
                >
                  {allDrawings.length > 1 && (
                    <p className="border-b bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                      Desenho {dIdx + 1}
                    </p>
                  )}
                  <ResolvedImage
                    src={drawing.url}
                    alt={`Desenho ${dIdx + 1} da medição ${index + 1}`}
                    className="mx-auto max-h-[min(70vh,480px)] w-full object-contain"
                    fallbackClassName="min-h-[120px]"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Sem desenho registrado
            </p>
          )}

          <MeasurementDimensionsSummary item={item} lookups={lookups} />

          <MeasurementPhotosSection
            expanded={photosExpanded}
            onExpandedChange={setPhotosExpanded}
            photoCount={photoCount}
          >
            {photoUrls.length > 0 ? (
              <PhotoGallery urls={photoUrls} showLabel={false} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma foto registrada para esta medição.
              </p>
            )}
          </MeasurementPhotosSection>
        </div>
      )}
    </article>
  );
}

export function MeasurementDimensionsSummary({
  item,
  lookups,
  variant = "stacked",
}: {
  item: MeasurementLineItem;
  lookups?: MeasurementLookups;
  variant?: "stacked" | "inline";
}) {
  const ambienteLabel = resolveLookupLabel(
    lookups?.ambientes ?? [],
    item.idAmbiente ?? null,
  );

  if (variant === "inline") {
    return (
      <>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-4 sm:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] sm:items-start sm:gap-x-10">
          {ambienteLabel ? (
            <div className="col-span-3 min-w-0 sm:col-span-1">
              <dt className="text-xs text-muted-foreground">Ambiente</dt>
              <dd className="mt-0.5 text-sm font-medium">{ambienteLabel}</dd>
            </div>
          ) : null}
          <MeasurementDimensionsDisplay item={item} />
        </dl>
      <MeasurementItemSpecSummary item={item} lookups={lookups} variant="dl" />
      {item.observacao?.trim() ? (
        <div className="mt-4 min-w-0">
          <dt className="text-xs text-muted-foreground">Observação</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm">
            {item.observacao.trim()}
          </dd>
        </div>
      ) : null}
    </>
  );
}

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      {ambienteLabel ? (
        <div className="mb-3">
          <dt className="text-xs text-muted-foreground">Ambiente</dt>
          <dd className="mt-0.5 text-sm font-medium">{ambienteLabel}</dd>
        </div>
      ) : null}
      <h4 className="text-sm font-medium">Dimensões (mm)</h4>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <MeasurementDimensionsDisplay item={item} />
      </dl>
      <MeasurementItemSpecSummary item={item} lookups={lookups} variant="dl" />
      {item.observacao?.trim() ? (
        <div className="mt-4">
          <dt className="text-xs text-muted-foreground">Observação</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-sm">
            {item.observacao.trim()}
          </dd>
        </div>
      ) : null}
    </div>
  );
}

export function hasSavedMeasurementForView(
  draft?: {
    items?: MeasurementLineItem[];
    photos?: string[];
  },
): boolean {
  if (!draft) return false;
  if (draft.photos?.length) return true;
  if (!draft.items?.length) return false;

  return draft.items.some(
    (item) =>
      Boolean(item.drawingUrl) ||
      Boolean(item.drawings?.length) ||
      Boolean(item.idAmbiente) ||
      Boolean(item.observacao?.trim()) ||
      Boolean(item.photos?.length) ||
      hasValidItemDimensions(item),
  );
}
