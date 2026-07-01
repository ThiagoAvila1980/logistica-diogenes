export type LogisticsSummary = {
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  driverName: string | null;
};

export async function getLogisticsSummaries(
  osIds: string[],
): Promise<Record<string, LogisticsSummary>> {
  if (osIds.length === 0) return {};

  const { getLogisticsSummariesDb } = await import("./logistics-db");
  return getLogisticsSummariesDb(osIds);
}
