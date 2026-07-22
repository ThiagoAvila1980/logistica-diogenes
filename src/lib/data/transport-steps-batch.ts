import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import type { TransportSteps } from "@/lib/transport-gates";
import { aggregateTransportStepsFromItems } from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export type TransportListingProgress = {
  steps: TransportSteps;
  items: MeasurementLineItem[];
};

export async function getTransportStepsForOrders(
  osIds: string[],
): Promise<Record<string, TransportSteps>> {
  const data = await getTransportListingProgressForOrders(osIds);
  return Object.fromEntries(
    Object.entries(data).map(([id, entry]) => [id, entry.steps]),
  );
}

export async function getTransportListingProgressForOrders(
  osIds: string[],
): Promise<Record<string, TransportListingProgress>> {
  if (osIds.length === 0) return {};

  const db = getDb();
  const rows = await db
    .select({
      id: measurements.id,
      items: measurements.items,
    })
    .from(measurements)
    .where(inArray(measurements.id, osIds));

  return Object.fromEntries(
    rows.map((row) => {
      const items = (row.items as MeasurementLineItem[] | null) ?? [];
      return [
        row.id,
        {
          items,
          steps: aggregateTransportStepsFromItems(items),
        },
      ];
    }),
  );
}
