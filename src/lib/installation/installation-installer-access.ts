import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { measurements } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  isVaoInstallationConcluded,
  selectInstallationLineItems,
} from "@/lib/workflow/aggregates";

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

/** Designação por vão apenas — sem fallback de responsável geral da OS. */
export function isInstallerResponsibleForOrder(
  userId: string,
  installerIds: readonly string[] | undefined,
): boolean {
  return isAssignedInstaller(userId, installerIds);
}

/**
 * Há vão de instalação incompleto designado a este instalador?
 * Sem vão no nome dele → false (OS some da listagem).
 */
export function hasPendingInstallationWorkForInstaller(
  items: MeasurementLineItem[],
  installerId: string,
): boolean {
  const scoped = selectInstallationLineItems(items);
  const relevant = scoped.filter(
    (i) => i.installationProgress?.installerId === installerId,
  );
  if (relevant.length === 0) return false;
  return relevant.some((i) => !isVaoInstallationConcluded(i));
}
