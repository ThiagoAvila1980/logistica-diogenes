import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import type { CuttingSteps } from "@/lib/transport-gates";
import {
  aggregateCuttingStepsFromItems,
  selectCuttingLineItems,
} from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { loadEspelhoTipoIds } from "@/lib/data/espelho-tipos";

export type CuttingListing = {
  items: MeasurementLineItem[];
  cuttingSteps: CuttingSteps;
};

export async function getCuttingListingForOrders(
  osIds: string[],
): Promise<Record<string, CuttingListing>> {
  if (osIds.length === 0) return {};

  const db = getDb();
  const [rows, espelhoTipoIds] = await Promise.all([
    db
      .select({
        id: measurements.id,
        items: measurements.items,
      })
      .from(measurements)
      .where(inArray(measurements.id, osIds)),
    loadEspelhoTipoIds(),
  ]);

  return Object.fromEntries(
    rows.map((row) => {
      const items = (row.items as MeasurementLineItem[] | null) ?? [];
      const cuttingItems = selectCuttingLineItems(items);
      return [
        row.id,
        {
          items,
          cuttingSteps: aggregateCuttingStepsFromItems(
            cuttingItems,
            espelhoTipoIds,
          ),
        },
      ];
    }),
  );
}
