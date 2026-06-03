"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

type ItemSpecValues = Pick<
  MeasurementLineItem,
  "idCor" | "idTipoVidro" | "idTipoEnvidracamento"
>;

type MeasurementItemSpecFieldsProps = {
  lookups: MeasurementLookups;
  itemId: string;
  values: ItemSpecValues;
  onChange: (values: ItemSpecValues) => void;
  disabled?: boolean;
};

export function MeasurementItemSpecFields({
  lookups,
  itemId,
  values,
  onChange,
  disabled = false,
}: MeasurementItemSpecFieldsProps) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor={`cor-${itemId}`}>Cor do perfil</Label>
        <Select
          id={`cor-${itemId}`}
          value={values.idCor ?? ""}
          disabled={disabled}
          className="h-12 text-base"
          onChange={(e) =>
            onChange({
              ...values,
              idCor: e.target.value || null,
            })
          }
        >
          <option value="">Selecione...</option>
          {lookups.cores.map((item) => (
            <option key={item.id} value={item.id}>
              {item.descricao}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`vidro-${itemId}`}>Vidro</Label>
        <Select
          id={`vidro-${itemId}`}
          value={values.idTipoVidro ?? ""}
          disabled={disabled}
          className="h-12 text-base"
          onChange={(e) =>
            onChange({
              ...values,
              idTipoVidro: e.target.value || null,
            })
          }
        >
          <option value="">Selecione...</option>
          {lookups.tipoVidro.map((item) => (
            <option key={item.id} value={item.id}>
              {item.descricao}
            </option>
          ))}
        </Select>
      </div>

      <div className="col-span-2 space-y-2 md:col-span-1">
        <Label htmlFor={`envidracamento-${itemId}`}>Tipo de envidraçamento</Label>
        <Select
          id={`envidracamento-${itemId}`}
          value={values.idTipoEnvidracamento ?? ""}
          disabled={disabled}
          className="h-12 text-base"
          onChange={(e) =>
            onChange({
              ...values,
              idTipoEnvidracamento: e.target.value || null,
            })
          }
        >
          <option value="">Selecione...</option>
          {lookups.tipoEnvidracamento.map((item) => (
            <option key={item.id} value={item.id}>
              {item.descricao}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function MeasurementItemSpecSummary({
  item,
  lookups,
  variant = "badges",
}: {
  item: MeasurementLineItem;
  lookups?: MeasurementLookups;
  variant?: "badges" | "dl";
}) {
  if (!lookups) return null;

  const cor = resolveLookupLabel(lookups.cores, item.idCor ?? null);
  const vidro = resolveLookupLabel(lookups.tipoVidro, item.idTipoVidro ?? null);
  const envidracamento = resolveLookupLabel(
    lookups.tipoEnvidracamento,
    item.idTipoEnvidracamento ?? null,
  );

  if (!cor && !vidro && !envidracamento) return null;

  if (variant === "badges") {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {cor && (
          <Badge variant="outline" className="text-[12px]">
            Cor: {cor}
          </Badge>
        )}
        {vidro && (
          <Badge variant="outline" className="text-[12px]">
            Vidro: {vidro}
          </Badge>
        )}
        {envidracamento && (
          <Badge variant="outline" className="text-[12px]">
            Envidraçamento: {envidracamento}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cor && (
        <div>
          <dt className="text-xs text-muted-foreground">Cor do perfil</dt>
          <dd className="mt-0.5 text-sm font-medium">{cor}</dd>
        </div>
      )}
      {vidro && (
        <div>
          <dt className="text-xs text-muted-foreground">Vidro</dt>
          <dd className="mt-0.5 text-sm font-medium">{vidro}</dd>
        </div>
      )}
      {envidracamento && (
        <div>
          <dt className="text-xs text-muted-foreground">Tipo de envidraçamento</dt>
          <dd className="mt-0.5 text-sm font-medium">{envidracamento}</dd>
        </div>
      )}
    </dl>
  );
}
