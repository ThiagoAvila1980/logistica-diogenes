"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { hasExtraDimensions } from "@/lib/measurement/dimensions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MeasurementDimensionsFieldsProps = {
  item: MeasurementLineItem;
  disabled?: boolean;
  onChange: (item: MeasurementLineItem) => void;
};

function parseDimensionInput(raw: string): number {
  if (raw === "") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function DimensionInput({
  id,
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="any"
        placeholder={placeholder}
        value={value > 0 ? value : ""}
        onChange={(e) => onChange(parseDimensionInput(e.target.value))}
        disabled={disabled}
        className="h-12 text-base"
      />
    </div>
  );
}

function ExtraDimensionList({
  kind,
  itemId,
  values,
  disabled,
  onValuesChange,
}: {
  kind: "largura" | "altura";
  itemId: string;
  values: number[];
  disabled?: boolean;
  onValuesChange: (values: number[]) => void;
}) {
  const kindLabel = kind === "largura" ? "Largura" : "Altura";
  const placeholder = kind === "largura" ? "ex: 900" : "ex: 1800";

  function updateAt(index: number, value: number) {
    const next = [...values];
    next[index] = value;
    onValuesChange(next);
  }

  function removeAt(index: number) {
    onValuesChange(values.filter((_, i) => i !== index));
  }

  function addRow() {
    onValuesChange([...values, 0]);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {kindLabel}s adicionais
      </p>
      <ul className="space-y-2">
        {values.map((value, index) => (
          <li key={`${kind}-extra-${index}`} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <DimensionInput
                id={`${kind}-extra-${itemId}-${index}`}
                label={`${kindLabel} ${index + 2}`}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(v) => updateAt(index, v)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-0.5 h-12 w-12 shrink-0 text-destructive hover:text-destructive"
              onClick={() => removeAt(index)}
              disabled={disabled}
              aria-label={`Remover ${kindLabel.toLowerCase()} ${index + 2}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5"
        onClick={addRow}
        disabled={disabled}
      >
        <Plus className="h-3.5 w-3.5" />
        {kindLabel}
      </Button>
    </div>
  );
}

export function MeasurementDimensionsFields({
  item,
  disabled,
  onChange,
}: MeasurementDimensionsFieldsProps) {
  const showExtras =
    item.mostrarMedidasExtras === true || hasExtraDimensions(item);

  const largurasExtras = item.largurasExtras ?? [];
  const alturasExtras = item.alturasExtras ?? [];

  function patch(partial: Partial<MeasurementLineItem>) {
    onChange({ ...item, ...partial });
  }

  function enableExtras() {
    patch({ mostrarMedidasExtras: true });
  }

  function disableExtras() {
    patch({
      mostrarMedidasExtras: false,
      largurasExtras: undefined,
      alturasExtras: undefined,
    });
  }

  return (
    <>
      <h4 className="mt-4 text-sm font-medium">Dimensões (mm)</h4>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                patch({ qty: 0 });
                return;
              }
              const parsed = Number.parseInt(raw, 10);
              if (!Number.isNaN(parsed)) {
                patch({ qty: parsed });
              }
            }}
            disabled={disabled}
            className="h-12 text-base"
          />
        </div>
        <DimensionInput
          id={`largura-${item.id}`}
          label="Largura"
          value={item.largura}
          placeholder="ex: 1200"
          disabled={disabled}
          onChange={(largura) => patch({ largura })}
        />
        <DimensionInput
          id={`altura-${item.id}`}
          label="Altura"
          value={item.altura}
          placeholder="ex: 2100"
          disabled={disabled}
          onChange={(altura) => patch({ altura })}
        />
      </div>

      {!showExtras ? (
        <Button
          type="button"
          variant="link"
          className="mt-2 h-auto px-0 text-sm text-muted-foreground text-primary"
          onClick={enableExtras}
          disabled={disabled}
        >
          Medidas adicionais +
        </Button>
      ) : (
        <div className="mt-4 space-y-4 rounded-lg border border-dashed bg-background/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Medidas adicionais</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Use quando a peça tiver mais de uma largura ou altura (ex. janela
                em arco). Indique no desenho qual medida é qual.
              </p>
            </div>
            {!hasExtraDimensions(item) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={disableExtras}
                disabled={disabled}
              >
                Ocultar
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ExtraDimensionList
              kind="largura"
              itemId={item.id}
              values={largurasExtras}
              disabled={disabled}
              onValuesChange={(largurasExtras) =>
                patch({
                  largurasExtras:
                    largurasExtras.length > 0 ? largurasExtras : undefined,
                  mostrarMedidasExtras: true,
                })
              }
            />
            <ExtraDimensionList
              kind="altura"
              itemId={item.id}
              values={alturasExtras}
              disabled={disabled}
              onValuesChange={(alturasExtras) =>
                patch({
                  alturasExtras:
                    alturasExtras.length > 0 ? alturasExtras : undefined,
                  mostrarMedidasExtras: true,
                })
              }
            />
          </div>
        </div>
      )}
    </>
  );
}
