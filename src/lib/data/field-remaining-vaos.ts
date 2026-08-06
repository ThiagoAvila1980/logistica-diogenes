import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { measurements } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { hasRemainingUnsentMeasurementItems } from "@/lib/workflow/aggregates";

/**
 * IDs de OS (já avançadas) que ainda têm vãos não enviados ao corte —
 * devem continuar aparecendo na listagem de medições.
 */
export async function listOrderIdsWithRemainingUnsentVaos(
  orderIds: string[],
): Promise<Set<string>> {
  if (orderIds.length === 0) return new Set();

  const db = getDb();
  const rows = await db
    .select({ id: measurements.id, items: measurements.items })
    .from(measurements)
    .where(inArray(measurements.id, orderIds));

  const result = new Set<string>();
  for (const row of rows) {
    const items = (row.items as MeasurementLineItem[] | null) ?? [];
    if (hasRemainingUnsentMeasurementItems(items)) {
      result.add(row.id);
    }
  }
  return result;
}
