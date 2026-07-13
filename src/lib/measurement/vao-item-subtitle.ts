import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import { formatDimensionsSummary } from "@/lib/measurement/dimensions";

export type VaoItemSubtitle = {
  spec: string;
  dims: string | null;
};

/**
 * Número estável do vão para exibição. Usa `vaoNumber` (persistido na
 * criação) quando disponível; cai para a posição no array (1-based) apenas
 * para itens salvos antes desta migração, que ainda não têm `vaoNumber`.
 */
export function getVaoNumber(
  item: Pick<MeasurementLineItem, "vaoNumber">,
  fallbackIndex: number,
): number {
  return item.vaoNumber ?? fallbackIndex + 1;
}

export function buildVaoItemSubtitle(
  item: MeasurementLineItem,
  index: number,
  lookups?: MeasurementLookups,
): VaoItemSubtitle {
  const ambiente = resolveLookupLabel(
    lookups?.ambientes ?? [],
    item.idAmbiente ?? null,
  );
  const envidracamento = resolveLookupLabel(
    lookups?.tipoEnvidracamento ?? [],
    item.idTipoEnvidracamento ?? null,
  );
  const dims = formatDimensionsSummary(item);
  const specParts = [ambiente, envidracamento].filter(Boolean);
  const spec =
    specParts.length > 0
      ? specParts.join(" — ")
      : `Vão ${getVaoNumber(item, index)}`;

  return { spec, dims: dims || null };
}

export function formatVaoItemFullLabel(subtitle: VaoItemSubtitle): string {
  return subtitle.dims ? `${subtitle.spec} — ${subtitle.dims}` : subtitle.spec;
}

/** Opção resumida de vão para seleção em UI (ex.: menu "Imprimir por Vão"). */
export type VaoOption = {
  id: string;
  vaoNumber: number;
  label: string;
};
