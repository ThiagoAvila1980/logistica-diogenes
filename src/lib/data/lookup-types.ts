export type LookupOption = {
  id: string;
  descricao: string;
  /** URL persistida no storage (tipos de envidraçamento com foto de referência). */
  imagemUrl?: string | null;
};

export type MeasurementLookups = {
  cores: LookupOption[];
  tipoVidro: LookupOption[];
  tipoEnvidracamento: LookupOption[];
  ambientes: LookupOption[];
};

export function resolveLookupLabel(
  options: LookupOption[],
  id: string | null | undefined,
): string | null {
  if (!id) return null;
  return options.find((o) => o.id === id)?.descricao ?? null;
}
