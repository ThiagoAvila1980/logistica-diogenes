import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { OsStatus } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { getDraftMeasurementType } from "@/lib/workflow/measurement-actions";
import type { MeasurementDbType } from "@/lib/workflow/measurement-actions";

/** Cabeçalho da medição (cliente, telefone, nº orçamento — origem PDF) */
export type MeasurementHeader = {
  cliente: string | null;
  telefone: string | null;
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

  if (useMockData()) {
    const data = mockRepository.getFieldMeasurement(osId, type);
    if (!data) return undefined;

    return {
      cliente: data.cliente,
      telefone: data.telefone,
      numeroOrcamento: data.numeroOrcamento,
      items: data.items,
      largura: data.dimensions?.largura,
      altura: data.dimensions?.altura,
      notes: data.notes,
      photos: data.photos,
    };
  }

  const { getFieldMeasurementDb } = await import("./field-db");
  return getFieldMeasurementDb(osId, type);
}
