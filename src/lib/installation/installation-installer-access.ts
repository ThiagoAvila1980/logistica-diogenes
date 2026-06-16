import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { measurements } from "@/db/schema";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export function collectInstallerIdsFromMeasurementItems(
  items: MeasurementLineItem[] | null | undefined,
): string[] {
  const ids = new Set<string>();
  for (const item of items ?? []) {
    const installerId = item.installationProgress?.installerId;
    if (installerId) ids.add(installerId);
  }
  return [...ids];
}

export async function getInstallerIdsByOsIds(
  osIds: string[],
): Promise<Record<string, string[]>> {
  if (osIds.length === 0) return {};

  if (useMockData()) {
    return mockRepository.getInstallerIdsByOsIds(osIds);
  }

  const db = getDb();
  const uniqueIds = [...new Set(osIds)];

  const rows = await db
    .select({ id: measurements.id, items: measurements.items })
    .from(measurements)
    .where(inArray(measurements.id, uniqueIds));

  return Object.fromEntries(
    uniqueIds.map((osId) => {
      const measurement = rows.find((row) => row.id === osId);
      return [
        osId,
        collectInstallerIdsFromMeasurementItems(
          measurement?.items as MeasurementLineItem[] | null | undefined,
        ),
      ];
    }),
  );
}

export function isAssignedInstaller(
  userId: string,
  installerIds: readonly string[] | undefined,
): boolean {
  return !!installerIds?.includes(userId);
}

/** Designação por vão ou responsável geral legado (sem vãos designados). */
export function isInstallerResponsibleForOrder(
  userId: string,
  installerIds: readonly string[] | undefined,
  assignedUserId: string | null,
): boolean {
  if (isAssignedInstaller(userId, installerIds)) return true;
  const hasPerVaoAssignment = (installerIds?.length ?? 0) > 0;
  return !hasPerVaoAssignment && assignedUserId === userId;
}
