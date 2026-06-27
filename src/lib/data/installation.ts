import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { InstallationSummary } from "./installation-db";

export type { InstallationSummary } from "./installation-db";

export async function getInstallationSummaries(
  osIds: string[],
  installerIdFilter?: string,
): Promise<Record<string, InstallationSummary>> {
  if (osIds.length === 0) return {};

  if (useMockData()) {
    return mockRepository.getInstallationSummaries(osIds);
  }

  const { getInstallationSummariesDb } = await import("./installation-db");
  return getInstallationSummariesDb(osIds, installerIdFilter);
}
