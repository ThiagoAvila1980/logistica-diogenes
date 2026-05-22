"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { resolveUploadDisplayUrlAction } from "@/actions/upload-actions";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { DrawingBoard } from "@/components/field/drawing-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MeasurementItemCardProps = {
  item: MeasurementLineItem;
  index: number;
  expanded: boolean;
  canRemove: boolean;
  disabled?: boolean;
  onChange: (item: MeasurementLineItem) => void;
  onRemove: () => void;
  onExpandedChange: (expanded: boolean) => void;
  onDrawingDirtyChange?: (dirty: boolean) => void;
};

export function MeasurementItemCard({
  item,
  index,
  expanded,
  canRemove,
  disabled,
  onChange,
  onRemove,
  onExpandedChange,
  onDrawingDirtyChange,
}: MeasurementItemCardProps) {
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
          <DrawingBoard
            key={resolvedDrawingUrl ?? item.id}
            initialImageUrl={resolvedDrawingUrl}
            disabled={disabled}
            onDirtyChange={onDrawingDirtyChange}
            onSave={(base64Image) => updateField("drawingUrl", base64Image)}
          />
          <p className="text-xs text-muted-foreground">
            Desenhe no quadro, use{" "}
            <span className="font-medium">tela cheia</span> para ampliar (celular
            deitado) e toque em <span className="font-medium">Salvar</span> antes
            de registrar a medição.
          </p>

          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="space-y-2">
              <Label htmlFor={`ambiente-${item.id}`}>Ambiente</Label>
              <Input
                id={`ambiente-${item.id}`}
                type="text"
                placeholder="ex: Sala, Quarto, Varanda"
                value={item.ambiente ?? ""}
                onChange={(e) => updateField("ambiente", e.target.value)}
                disabled={disabled}
                className="h-12 text-base"
              />
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
          </div>
        </div>
      )}
    </article>
  );
}

export function createEmptyMeasurementItem(id: string): MeasurementLineItem {
  return {
    id,
    ambiente: "",
    qty: 0,
    largura: 0,
    altura: 0,
    drawingUrl: null,
  };
}
