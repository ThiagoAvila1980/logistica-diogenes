import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { InstallationSteps } from "@/lib/transport-gates";
import { aggregateInstallationStepsFromItems } from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export async function getInstallationStepsForOrders(
  osIds: string[],
): Promise<Record<string, InstallationSteps>> {
  if (osIds.length === 0) return {};

  if (useMockData()) {
    return mockRepository.getInstallationStepsForOrders(osIds);
  }

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
      return [row.id, aggregateInstallationStepsFromItems(items)];
    }),
  );
}
