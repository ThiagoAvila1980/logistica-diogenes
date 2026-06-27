import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";

export type LogisticsSummary = {
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  driverName: string | null;
};

export async function getLogisticsSummaries(
  osIds: string[],
): Promise<Record<string, LogisticsSummary>> {
  if (osIds.length === 0) return {};

  if (useMockData()) {
    return mockRepository.getLogisticsSummaries(osIds);
  }

  const { getLogisticsSummariesDb } = await import("./logistics-db");
  return getLogisticsSummariesDb(osIds);
}
