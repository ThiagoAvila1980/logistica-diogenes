"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { Button } from "@/components/ui/button";

type MeasurementItemViewProps = {
  item: MeasurementLineItem;
  index: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function MeasurementItemView({
  item,
  index,
  expanded,
  onExpandedChange,
}: MeasurementItemViewProps) {
  const hasDrawing = Boolean(item.drawingUrl);
  const hasDimensions =
    Boolean(item.ambiente?.trim()) ||
    item.qty > 0 ||
    item.largura > 0 ||
    item.altura > 0;

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
          {item.ambiente?.trim() ? (
            <p className="font-medium text-foreground">{item.ambiente.trim()}</p>
          ) : null}
          <p className="tabular-nums">
            {item.qty > 0 ? `${item.qty} × ` : ""}
            {item.largura > 0 || item.altura > 0
              ? `${item.largura || "—"} × ${item.altura || "—"} mm`
              : null}
          </p>
        </div>
      )}

      {expanded && (
        <div
          id={`measurement-item-body-${item.id}`}
          className="mt-3 space-y-3"
        >
          {hasDrawing ? (
            <div className="overflow-hidden rounded-lg border bg-white">
              <ResolvedImage
                src={item.drawingUrl!}
                alt={`Desenho da medição ${index + 1}`}
                className="mx-auto max-h-[min(70vh,480px)] w-full object-contain"
                fallbackClassName="min-h-[120px]"
              />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Sem desenho registrado
            </p>
          )}

          <MeasurementDimensionsSummary item={item} />
        </div>
      )}
    </article>
  );
}

export function MeasurementDimensionsSummary({
  item,
}: {
  item: MeasurementLineItem;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      {item.ambiente?.trim() ? (
        <div className="mb-3">
          <dt className="text-xs text-muted-foreground">Ambiente</dt>
          <dd className="mt-0.5 text-sm font-medium">{item.ambiente.trim()}</dd>
        </div>
      ) : null}
      <h4 className="text-sm font-medium">Dimensões (mm)</h4>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Quantidade</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums">
            {item.qty > 0 ? item.qty : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Largura</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums">
            {item.largura > 0 ? item.largura : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Altura</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums">
            {item.altura > 0 ? item.altura : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function hasSavedMeasurementForView(
  draft?: {
    items?: MeasurementLineItem[];
    photos?: string[];
    notes?: string;
  },
): boolean {
  if (!draft) return false;
  if (draft.photos?.length) return true;
  if (draft.notes?.trim()) return true;
  if (!draft.items?.length) return false;

  return draft.items.some(
    (item) =>
      Boolean(item.drawingUrl) ||
      Boolean(item.ambiente?.trim()) ||
      (item.qty > 0 && item.largura > 0 && item.altura > 0),
  );
}
