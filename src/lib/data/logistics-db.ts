import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { transportLogs, vehicles } from "@/db/schema";

export type LogisticsSummary = {
  vehiclePlate: string | null;
  vehicleDescription: string | null;
};

export async function getLogisticsSummariesDb(
  osIds: string[],
): Promise<Record<string, LogisticsSummary>> {
  if (osIds.length === 0) return {};

  const db = getDb();
  const rows = await db
    .select({
      osId: transportLogs.osId,
      vehiclePlate: transportLogs.vehiclePlate,
      vehicleDescription: vehicles.description,
    })
    .from(transportLogs)
    .leftJoin(vehicles, eq(transportLogs.vehicleId, vehicles.id))
    .where(inArray(transportLogs.osId, osIds));

  return Object.fromEntries(
    rows.map((r) => [
      r.osId,
      {
        vehiclePlate: r.vehiclePlate,
        vehicleDescription: r.vehicleDescription,
      },
    ]),
  );
}
