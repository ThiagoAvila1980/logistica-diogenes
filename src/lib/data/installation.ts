import type { InstallationSummary } from "./installation-db";

export type { InstallationSummary } from "./installation-db";

export async function getInstallationSummaries(
  osIds: string[],
  installerIdFilter?: string,
): Promise<Record<string, InstallationSummary>> {
  if (osIds.length === 0) return {};

  const { getInstallationSummariesDb } = await import("./installation-db");
  return getInstallationSummariesDb(osIds, installerIdFilter);
}
