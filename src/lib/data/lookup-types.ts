export type LookupOption = {
  id: string;
  descricao: string;
};

export type MeasurementLookups = {
  cores: LookupOption[];
  tipoVidro: LookupOption[];
  tipoEnvidracamento: LookupOption[];
};

export function resolveLookupLabel(
  options: LookupOption[],
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  return options.find((o) => o.id === id)?.descricao ?? null;
}
