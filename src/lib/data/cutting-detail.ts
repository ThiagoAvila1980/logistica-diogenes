import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { measurements, cuttingPlans } from "@/db/schema";
import { resolveUploadDisplayUrl } from "@/lib/upload/resolve-display-url";
import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

async function resolveMeasurementItems(
  items: MeasurementLineItem[],
): Promise<MeasurementLineItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      drawingUrl: item.drawingUrl
        ? await resolveUploadDisplayUrl(item.drawingUrl)
        : item.drawingUrl,
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
  cuttingSteps: {
    corte: boolean;
    embalagem: boolean;
    acessorios: boolean;
  };
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
    .where(
      and(
        eq(measurements.osId, osId),
        eq(measurements.type, "final"),
      ),
    )
    .limit(1);

  const [cut] = await db
    .select({
      corteFeito: cuttingPlans.corteFeito,
      embalagemFeita: cuttingPlans.embalagemFeita,
      acessoriosFeitos: cuttingPlans.acessoriosFeitos,
    })
    .from(cuttingPlans)
    .where(eq(cuttingPlans.osId, osId))
    .limit(1);

  const items = (meas?.items as MeasurementLineItem[]) ?? [];
  const photos = (meas?.photos as string[]) ?? [];

  return {
    measurement: meas
      ? {
          cliente: meas.cliente ?? null,
          items: await resolveMeasurementItems(items),
          photos: await Promise.all(photos.map((url) => resolveUploadDisplayUrl(url))),
          notes: meas.notes ?? null,
          dimensions: meas.dimensions as Record<string, number> | null,
        }
      : null,
    cuttingSteps: {
      corte: cut?.corteFeito ?? false,
      embalagem: cut?.embalagemFeita ?? false,
      acessorios: cut?.acessoriosFeitos ?? false,
    },
  };
}
