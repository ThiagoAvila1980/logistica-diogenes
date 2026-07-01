import type { OsStatus } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { getDraftMeasurementType } from "@/lib/workflow/measurement-actions";
import type { MeasurementDbType } from "@/lib/workflow/measurement-actions";

/** Cabeçalho da medição (cliente, telefone, endereço, nº orçamento — origem PDF) */
export type MeasurementHeader = {
  cliente: string | null;
  telefone: string | null;
  endereco: string | null;
  numeroOrcamento: string | null;
};

export type FieldMeasurementDraft = MeasurementHeader & {
  items?: MeasurementLineItem[];
  /** @deprecated legado — migrado para items na leitura */
  largura?: number;
  altura?: number;
  notes?: string;
  photos?: string[];
};

export async function getFieldMeasurementDraft(
  osId: string,
  order: { status: OsStatus },
  typeOverride?: MeasurementDbType,
): Promise<FieldMeasurementDraft | undefined> {
  const type =
    typeOverride ??
    getDraftMeasurementType({ etapa: order.status });
  if (!type) return undefined;

  const { getFieldMeasurementDb } = await import("./field-db");
  return getFieldMeasurementDb(osId, type);
}
