import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { measurements, cuttingPlans } from "@/db/schema";
import { resolveUploadDisplayUrl } from "@/lib/upload/resolve-display-url";
import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { CuttingSteps } from "@/lib/transport-gates";
import { aggregateCuttingStepsFromItems, selectCuttingLineItems } from "@/lib/workflow/aggregates";

/**
 * @deprecated Importe de `@/lib/workflow/aggregates`.
 * Reexport mantido para compatibilidade com importadores existentes.
 */
export { aggregateCuttingStepsFromItems };

async function resolveMeasurementItems(
  items: MeasurementLineItem[],
): Promise<MeasurementLineItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      drawingUrl: item.drawingUrl
        ? await resolveUploadDisplayUrl(item.drawingUrl)
        : item.drawingUrl,
      drawings: item.drawings?.length
        ? await Promise.all(
            item.drawings.map(async (d) => ({
              ...d,
              url: await resolveUploadDisplayUrl(d.url),
            })),
          )
        : item.drawings,
      photos: item.photos?.length
        ? await Promise.all(
            item.photos.map((url) => resolveUploadDisplayUrl(url)),
          )
        : item.photos,
    })),
  );
}

export type CuttingDetail = {
  measurement: {
    cliente: string | null;
    items: MeasurementLineItem[];
    photos: string[];
    notes: string | null;
    dimensions: Record<string, number> | null;
  } | null;
  /** Progresso agregado de todos os vãos (usado pelos transport gates) */
  cuttingSteps: CuttingSteps;
  cutterNotes: string | null;
};

export async function getCuttingDetailForOs(osId: string): Promise<CuttingDetail> {
  if (useMockData()) {
    return mockRepository.getCuttingDetail(osId);
  }

  const db = getDb();

  const [meas] = await db
    .select({
      cliente: measurements.cliente,
      items: measurements.items,
      photos: measurements.photos,
      notes: measurements.notes,
      dimensions: measurements.dimensions,
    })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  const [cut] = await db
    .select({ cutterNotes: cuttingPlans.cutterNotes })
    .from(cuttingPlans)
    .where(eq(cuttingPlans.idMedicao, osId))
    .limit(1);

  const allItems = (meas?.items as MeasurementLineItem[]) ?? [];
  const photos = (meas?.photos as string[]) ?? [];

  // Mostra somente os vãos enviados para o corte.
  // Retrocompatibilidade: se nenhum item tiver a flag, exibe todos.
  const cuttingItems = selectCuttingLineItems(allItems);

  const resolvedItems = await resolveMeasurementItems(cuttingItems);

  return {
    measurement: meas
      ? {
          cliente: meas.cliente ?? null,
          items: resolvedItems,
          photos: await Promise.all(photos.map((url) => resolveUploadDisplayUrl(url))),
          notes: meas.notes ?? null,
          dimensions: meas.dimensions as Record<string, number> | null,
        }
      : null,
    // O progresso agrega somente os vãos enviados para o corte
    cuttingSteps: aggregateCuttingStepsFromItems(cuttingItems),
    cutterNotes: cut?.cutterNotes ?? null,
  };
}
