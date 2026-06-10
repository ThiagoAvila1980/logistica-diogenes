import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { resolveLookupLabel } from "@/lib/data/lookup-types";
import { formatDimensionsSummary } from "@/lib/measurement/dimensions";

export type VaoItemSubtitle = {
  spec: string;
  dims: string | null;
};

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
    specParts.length > 0 ? specParts.join(" — ") : `Vão ${index + 1}`;

  return { spec, dims: dims || null };
}

export function formatVaoItemFullLabel(subtitle: VaoItemSubtitle): string {
  return subtitle.dims ? `${subtitle.spec} — ${subtitle.dims}` : subtitle.spec;
}
