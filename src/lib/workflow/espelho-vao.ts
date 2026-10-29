import type { MeasurementLineItem } from "@/lib/workflow/schemas";

/** Tipos cuja descrição contém a palavra "espelho" (ou "espelhos"). */
const ESPELHO_PATTERN = /\bespelhos?\b/i;

export type EspelhoTipoRef = { id: string; descricao: string };

type VaoTipoRef = Pick<MeasurementLineItem, "idTipoEnvidracamento">;

export function descricaoIndicaEspelho(
  descricao: string | null | undefined,
): boolean {
  return ESPELHO_PATTERN.test(descricao ?? "");
}

export function espelhoTipoIdsFromDescricoes(
  tipos: readonly EspelhoTipoRef[],
): ReadonlySet<string> {
  return new Set(
    tipos.filter((tipo) => descricaoIndicaEspelho(tipo.descricao)).map((tipo) => tipo.id),
  );
}

export function isEspelhoVao(
  item: VaoTipoRef,
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  const id = item.idTipoEnvidracamento;
  return Boolean(id && espelhoTipoIds.has(id));
}

export function applicableCuttingSteps(
  item: VaoTipoRef,
  espelhoTipoIds: ReadonlySet<string>,
): Array<"corte" | "embalagem" | "acessorios" | "vidros"> {
  if (isEspelhoVao(item, espelhoTipoIds)) return ["vidros"];
  return ["corte", "embalagem", "acessorios", "vidros"];
}

export function applicableTransportSteps(
  item: VaoTipoRef,
  espelhoTipoIds: ReadonlySet<string>,
): Array<"perfilEstrutural" | "perfilTotal" | "acessorios" | "vidros"> {
  if (isEspelhoVao(item, espelhoTipoIds)) return ["vidros"];
  return ["perfilEstrutural", "perfilTotal", "acessorios", "vidros"];
}

export function applicableInstallationSteps(
  item: VaoTipoRef,
  espelhoTipoIds: ReadonlySet<string>,
): Array<"estrutural" | "vidros" | "acabamento"> {
  if (isEspelhoVao(item, espelhoTipoIds)) return ["vidros", "acabamento"];
  return ["estrutural", "vidros", "acabamento"];
}

export function cuttingStepApplies(
  item: VaoTipoRef,
  step: "corte" | "embalagem" | "acessorios" | "vidros",
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  return applicableCuttingSteps(item, espelhoTipoIds).includes(step);
}

export function transportStepApplies(
  item: VaoTipoRef,
  step: "perfilEstrutural" | "perfilTotal" | "acessorios" | "vidros",
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  return applicableTransportSteps(item, espelhoTipoIds).includes(step);
}

export function installationStepApplies(
  item: VaoTipoRef,
  step: "estrutural" | "vidros" | "acabamento",
  espelhoTipoIds: ReadonlySet<string>,
): boolean {
  return applicableInstallationSteps(item, espelhoTipoIds).includes(step);
}
