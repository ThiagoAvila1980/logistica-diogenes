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
      idMedicao: transportLogs.idMedicao,
      vehicleId: transportLogs.vehicleId,
      vehiclePlate: vehicles.plate,
      vehicleDescription: vehicles.description,
    })
    .from(transportLogs)
    .leftJoin(vehicles, eq(transportLogs.vehicleId, vehicles.id))
    .where(inArray(transportLogs.idMedicao, osIds));

  return Object.fromEntries(
    rows.map((r) => [
      r.idMedicao,
      {
        vehiclePlate: r.vehicleId ? r.vehiclePlate : null,
        vehicleDescription: r.vehicleId ? r.vehicleDescription : null,
      },
    ]),
  );
}
