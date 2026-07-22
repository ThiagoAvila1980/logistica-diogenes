import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import type { InstallationSteps } from "@/lib/transport-gates";
import {
  aggregateAllVaosInstallationConcluded,
  aggregateInstallationStepsFromItems,
} from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export type InstallationOrderProgress = InstallationSteps & {
  todosVaosConcluidos: boolean;
};

export type InstallationListingProgress = InstallationOrderProgress & {
  items: MeasurementLineItem[];
};

export async function getInstallationStepsForOrders(
  osIds: string[],
): Promise<Record<string, InstallationOrderProgress>> {
  const data = await getInstallationListingProgressForOrders(osIds);
  return Object.fromEntries(
    Object.entries(data).map(([id, { items: _items, ...progress }]) => [
      id,
      progress,
    ]),
  );
}

export async function getInstallationListingProgressForOrders(
  osIds: string[],
): Promise<Record<string, InstallationListingProgress>> {
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
          ...aggregateInstallationStepsFromItems(items),
          todosVaosConcluidos: aggregateAllVaosInstallationConcluded(items),
        },
      ];
    }),
  );
}
