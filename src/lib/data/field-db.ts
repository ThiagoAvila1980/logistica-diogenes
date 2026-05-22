import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import type { FieldMeasurementDraft } from "./field";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { eqMeasurementType } from "./order-measurement-join";

export async function getFieldMeasurementDb(
  osId: string,
  type: "orcamento" | "final",
): Promise<FieldMeasurementDraft | undefined> {
  const db = getDb();
  const [row] = await db
    .select({
      cliente: measurements.cliente,
      telefone: measurements.telefone,
      numeroOrcamento: measurements.numeroOrcamento,
      dimensions: measurements.dimensions,
      items: measurements.items,
      notes: measurements.notes,
      photos: measurements.photos,
    })
    .from(measurements)
    .where(and(eq(measurements.osId, osId), eqMeasurementType(type)))
    .limit(1);

  if (!row) return undefined;

  const items = row.items as MeasurementLineItem[] | null;
  const d = row.dimensions ?? {};

  return {
    cliente: row.cliente,
    telefone: row.telefone,
    numeroOrcamento: row.numeroOrcamento,
    items: items ?? undefined,
    largura: d.largura,
    altura: d.altura,
    notes: row.notes ?? undefined,
    photos: row.photos ?? [],
  };
}
