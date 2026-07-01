import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import type { TransportSteps } from "@/lib/transport-gates";
import { aggregateTransportStepsFromItems } from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export async function getTransportStepsForOrders(
  osIds: string[],
): Promise<Record<string, TransportSteps>> {
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
      return [row.id, aggregateTransportStepsFromItems(items)];
    }),
  );
}
