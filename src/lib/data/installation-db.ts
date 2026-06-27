import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, users } from "@/db/schema";
import { collectInstallerIdsFromMeasurementItems } from "@/lib/installation/installation-installer-access";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export type InstallationSummary = {
  installerName: string | null;
  scheduledDate: Date | null;
};

function formatAssigneeNames(
  ids: string[],
  nameById: Map<string, string>,
): string | null {
  const names = [...new Set(ids)]
    .map((id) => nameById.get(id))
    .filter((name): name is string => !!name);
  return names.length > 0 ? names.join(", ") : null;
}

function resolveInstallerIds(
  items: MeasurementLineItem[] | null | undefined,
  assignedUserId: string | null,
): string[] {
  const fromItems = collectInstallerIdsFromMeasurementItems(items);
  if (fromItems.length > 0) return fromItems;
  return assignedUserId ? [assignedUserId] : [];
}

function resolveScheduledDate(
  items: MeasurementLineItem[] | null | undefined,
): Date | null {
  const dates = (items ?? [])
    .map((item) => item.installationProgress?.scheduledInstallationDate)
    .filter((date): date is string => !!date);

  if (dates.length === 0) return null;

  const earliest = [...new Set(dates)].sort()[0];
  return new Date(earliest);
}

export async function getInstallationSummariesDb(
  osIds: string[],
  installerIdFilter?: string,
): Promise<Record<string, InstallationSummary>> {
  if (osIds.length === 0) return {};

  const db = getDb();
  const uniqueIds = [...new Set(osIds)];

  const measurementRows = await db
    .select({
      id: measurements.id,
      assignedUserId: measurements.assignedUserId,
      items: measurements.items,
    })
    .from(measurements)
    .where(inArray(measurements.id, uniqueIds));

  const installerIdsByOs = Object.fromEntries(
    uniqueIds.map((osId) => {
      const measurement = measurementRows.find((row) => row.id === osId);
      const resolved = resolveInstallerIds(
        measurement?.items as MeasurementLineItem[] | null | undefined,
        measurement?.assignedUserId ?? null,
      );
      const filtered = installerIdFilter
        ? resolved.filter((id) => id === installerIdFilter)
        : resolved;
      return [osId, filtered];
    }),
  );

  const allInstallerIds = [...new Set(Object.values(installerIdsByOs).flat())];
  const installerNameRows =
    allInstallerIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, allInstallerIds))
      : [];
  const installerNameById = new Map(
    installerNameRows.map((row) => [row.id, row.name]),
  );

  return Object.fromEntries(
    uniqueIds.map((osId) => {
      const measurement = measurementRows.find((row) => row.id === osId);
      const items = measurement?.items as MeasurementLineItem[] | null | undefined;

      return [
        osId,
        {
          installerName: formatAssigneeNames(
            installerIdsByOs[osId] ?? [],
            installerNameById,
          ),
          scheduledDate: resolveScheduledDate(items),
        },
      ];
    }),
  );
}
