import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { measurements, transportLogs } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { SessionUser } from "@/lib/auth/session-types";
import { canViewAllOrders, hasAnyRole } from "@/lib/auth/permissions";

export function collectDriverIdsFromMeasurementItems(
  items: MeasurementLineItem[] | null | undefined,
): string[] {
  const ids = new Set<string>();
  for (const item of items ?? []) {
    const driverId = item.transportProgress?.driverId;
    if (driverId) ids.add(driverId);
  }
  return [...ids];
}

export function mergeDriverIds(
  ...sources: Array<readonly (string | null | undefined)[]>
): string[] {
  const ids = new Set<string>();
  for (const source of sources) {
    for (const id of source) {
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export async function getDriverIdsByOsIds(
  osIds: string[],
): Promise<Record<string, string[]>> {
  if (osIds.length === 0) return {};

  const db = getDb();
  const uniqueIds = [...new Set(osIds)];

  const [measurementRows, transportRows] = await Promise.all([
    db
      .select({ id: measurements.id, items: measurements.items })
      .from(measurements)
      .where(inArray(measurements.id, uniqueIds)),
    db
      .select({
        idMedicao: transportLogs.idMedicao,
        driverId: transportLogs.driverId,
      })
      .from(transportLogs)
      .where(inArray(transportLogs.idMedicao, uniqueIds)),
  ]);

  const logDriverByOs = Object.fromEntries(
    transportRows.map((row) => [row.idMedicao, row.driverId]),
  );

  return Object.fromEntries(
    uniqueIds.map((osId) => {
      const measurement = measurementRows.find((row) => row.id === osId);
      const itemDrivers = collectDriverIdsFromMeasurementItems(
        measurement?.items as MeasurementLineItem[] | null | undefined,
      );
      const logDriver = logDriverByOs[osId];
      return [
        osId,
        mergeDriverIds(itemDrivers, logDriver ? [logDriver] : []),
      ];
    }),
  );
}

export function isAssignedTransportDriver(
  userId: string,
  driverIds: readonly string[] | undefined,
): boolean {
  return !!driverIds?.includes(userId);
}

/**
 * Motorista só enxerga/opera os vãos em que está designado.
 * Admin/gerente (ou outros papéis) enxergam todos os vãos da OS.
 * Usada tanto para filtrar a listagem quanto para validar as actions de escrita.
 */
export function canAccessVaoAsSession(
  session: SessionUser,
  item: Pick<MeasurementLineItem, "transportProgress">,
): boolean {
  if (canViewAllOrders(session.roles)) return true;
  if (!hasAnyRole(session.roles, ["motorista"])) return true;

  return item.transportProgress?.driverId === session.userId;
}

/** Filtra os vãos de uma OS para o que a sessão do motorista pode ver/operar. */
export function filterVaoItemsForSession<
  T extends { transportProgress?: MeasurementLineItem["transportProgress"] },
>(items: T[], session: SessionUser | null): T[] {
  if (!session) return [];
  if (canViewAllOrders(session.roles)) return items;
  if (!hasAnyRole(session.roles, ["motorista"])) return items;

  return items.filter((item) => item.transportProgress?.driverId === session.userId);
}
