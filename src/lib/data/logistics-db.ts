import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { transportLogs, vehicles, measurements, users } from "@/db/schema";
import {
  collectDriverIdsFromMeasurementItems,
  mergeDriverIds,
} from "@/lib/logistics/transport-driver-access";
import {
  collectVehicleIdsFromMeasurementItems,
  mergeVehicleIds,
} from "@/lib/logistics/transport-vehicle-access";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export type LogisticsSummary = {
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  driverName: string | null;
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

export async function getLogisticsSummariesDb(
  osIds: string[],
): Promise<Record<string, LogisticsSummary>> {
  if (osIds.length === 0) return {};

  const db = getDb();
  const uniqueIds = [...new Set(osIds)];

  const [transportRows, measurementRows] = await Promise.all([
    db
      .select({
        idMedicao: transportLogs.idMedicao,
        vehicleId: transportLogs.vehicleId,
        driverId: transportLogs.driverId,
        vehiclePlate: vehicles.plate,
        vehicleDescription: vehicles.description,
      })
      .from(transportLogs)
      .leftJoin(vehicles, eq(transportLogs.vehicleId, vehicles.id))
      .where(inArray(transportLogs.idMedicao, uniqueIds)),
    db
      .select({ id: measurements.id, items: measurements.items })
      .from(measurements)
      .where(inArray(measurements.id, uniqueIds)),
  ]);

  const driverIdsByOs = Object.fromEntries(
    uniqueIds.map((osId) => {
      const measurement = measurementRows.find((row) => row.id === osId);
      const transport = transportRows.find((row) => row.idMedicao === osId);
      const itemDrivers = collectDriverIdsFromMeasurementItems(
        measurement?.items as MeasurementLineItem[] | null | undefined,
      );
      return [
        osId,
        mergeDriverIds(
          itemDrivers,
          transport?.driverId ? [transport.driverId] : [],
        ),
      ];
    }),
  );

  const allDriverIds = [...new Set(Object.values(driverIdsByOs).flat())];
  const vehicleIdsByOs = Object.fromEntries(
    uniqueIds.map((osId) => {
      const measurement = measurementRows.find((row) => row.id === osId);
      const transport = transportRows.find((row) => row.idMedicao === osId);
      const itemVehicles = collectVehicleIdsFromMeasurementItems(
        measurement?.items as MeasurementLineItem[] | null | undefined,
      );
      return [
        osId,
        mergeVehicleIds(
          itemVehicles,
          transport?.vehicleId ? [transport.vehicleId] : [],
        ),
      ];
    }),
  );

  const allVehicleIds = [...new Set(Object.values(vehicleIdsByOs).flat())];
  const driverNameRows =
    allDriverIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, allDriverIds))
      : [];
  const driverNameById = new Map(driverNameRows.map((row) => [row.id, row.name]));
  const vehicleLabelRows =
    allVehicleIds.length > 0
      ? await db
          .select({
            id: vehicles.id,
            plate: vehicles.plate,
            description: vehicles.description,
          })
          .from(vehicles)
          .where(inArray(vehicles.id, allVehicleIds))
      : [];
  const vehicleLabelById = new Map(
    vehicleLabelRows.map((row) => [
      row.id,
      row.description
        ? `${row.description} (${row.plate})`
        : row.plate,
    ]),
  );

  function formatVehicleNames(ids: string[]): string | null {
    const labels = [...new Set(ids)]
      .map((id) => vehicleLabelById.get(id))
      .filter((label): label is string => !!label);
    return labels.length > 0 ? labels.join(", ") : null;
  }

  return Object.fromEntries(
    uniqueIds.map((osId) => {
      const transport = transportRows.find((row) => row.idMedicao === osId);
      const vehicleIds = vehicleIdsByOs[osId] ?? [];
      const legacyVehicleLabel =
        transport?.vehicleId && vehicleIds.length === 0
          ? transport.vehicleDescription
            ? `${transport.vehicleDescription} (${transport.vehiclePlate})`
            : transport.vehiclePlate
          : null;
      return [
        osId,
        {
          vehiclePlate: formatVehicleNames(vehicleIds) ?? legacyVehicleLabel,
          vehicleDescription: null,
          driverName: formatAssigneeNames(
            driverIdsByOs[osId] ?? [],
            driverNameById,
          ),
        },
      ];
    }),
  );
}
