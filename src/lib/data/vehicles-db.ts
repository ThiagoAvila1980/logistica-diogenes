import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles, transportLogs, measurements } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { collectVehicleIdsFromMeasurementItems } from "@/lib/logistics/transport-vehicle-access";

export type VehicleRow = {
  id: string;
  description: string;
  plate: string;
  active: boolean;
  inUse: boolean;
};

const ACTIVE_TRANSPORT_STATUSES = [
  "transporte_perfil",
  "transporte_estrutural",
  "transporte_perfis_total",
  "transporte_acessorios",
  "transporte_levar_vidro",
] as const;

type VehicleAssignment = { vehicleId: string; osId: string };

async function loadActiveTransportVehicleAssignmentsDb(): Promise<VehicleAssignment[]> {
  const db = getDb();
  const rows = await db
    .select({
      osId: measurements.id,
      items: measurements.items,
      logVehicleId: transportLogs.vehicleId,
    })
    .from(measurements)
    .leftJoin(transportLogs, eq(transportLogs.idMedicao, measurements.id))
    .where(inArray(measurements.etapa, [...ACTIVE_TRANSPORT_STATUSES]));

  const assignments: VehicleAssignment[] = [];
  for (const row of rows) {
    const items = (row.items as MeasurementLineItem[]) ?? [];
    for (const vehicleId of collectVehicleIdsFromMeasurementItems(items)) {
      assignments.push({ vehicleId, osId: row.osId });
    }
    if (row.logVehicleId) {
      assignments.push({ vehicleId: row.logVehicleId, osId: row.osId });
    }
  }
  return assignments;
}

export async function listVehiclesDb(): Promise<VehicleRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: vehicles.id,
      description: vehicles.description,
      plate: vehicles.plate,
      active: vehicles.active,
    })
    .from(vehicles)
    .orderBy(desc(vehicles.createdAt));

  const inUseRows = await loadActiveTransportVehicleAssignmentsDb();

  const inUseSet = new Set(inUseRows.map((r) => r.vehicleId));

  return rows.map((r) => ({
    ...r,
    inUse: inUseSet.has(r.id),
  }));
}

export async function listActiveVehiclesDb(): Promise<
  Pick<VehicleRow, "id" | "description" | "plate">[]
> {
  const db = getDb();
  return db
    .select({
      id: vehicles.id,
      description: vehicles.description,
      plate: vehicles.plate,
    })
    .from(vehicles)
    .where(eq(vehicles.active, true))
    .orderBy(vehicles.description);
}

export async function getVehiclePlateDb(
  vehicleId: string,
): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ plate: vehicles.plate })
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);
  return row?.plate ?? null;
}

export async function isVehicleInUseDb(vehicleId: string): Promise<boolean> {
  const assignments = await loadActiveTransportVehicleAssignmentsDb();
  return assignments.some((a) => a.vehicleId === vehicleId);
}

export async function isVehicleInUseByOtherOsDb(
  vehicleId: string,
  excludeOsId: string,
): Promise<boolean> {
  const assignments = await loadActiveTransportVehicleAssignmentsDb();
  return assignments.some(
    (a) => a.vehicleId === vehicleId && a.osId !== excludeOsId,
  );
}

export type VehicleOptionForSelection = {
  id: string;
  description: string;
  plate: string;
  unavailable: boolean;
};

export async function listVehiclesForTransportSelectionDb(
  osId: string,
): Promise<VehicleOptionForSelection[]> {
  const db = getDb();
  const active = await listActiveVehiclesDb();
  const byId = new Map(active.map((v) => [v.id, v]));

  const [measRow] = await db
    .select({ items: measurements.items })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);

  const assignedIds = collectVehicleIdsFromMeasurementItems(
    measRow?.items as MeasurementLineItem[] | null | undefined,
  );

  const [legacyAssigned] = await db
    .select({
      id: vehicles.id,
      description: vehicles.description,
      plate: vehicles.plate,
    })
    .from(transportLogs)
    .innerJoin(vehicles, eq(transportLogs.vehicleId, vehicles.id))
    .where(eq(transportLogs.idMedicao, osId))
    .limit(1);

  if (legacyAssigned && !assignedIds.includes(legacyAssigned.id)) {
    assignedIds.push(legacyAssigned.id);
  }

  for (const vehicleId of assignedIds) {
    if (byId.has(vehicleId)) continue;
    const [vehicle] = await db
      .select({
        id: vehicles.id,
        description: vehicles.description,
        plate: vehicles.plate,
      })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1);
    if (vehicle) byId.set(vehicle.id, vehicle);
  }

  const rows = await Promise.all(
    [...byId.values()].map(async (vehicle) => ({
      ...vehicle,
      unavailable: await isVehicleInUseByOtherOsDb(vehicle.id, osId),
    })),
  );

  return rows.sort((a, b) =>
    a.description.localeCompare(b.description, "pt-BR"),
  );
}

export async function upsertVehicleDb(data: {
  id?: string;
  description: string;
  plate: string;
  active?: boolean;
}): Promise<string> {
  const db = getDb();
  const plate = data.plate.trim().toUpperCase();
  const values = {
    description: data.description.trim(),
    plate,
    active: data.active ?? true,
    updatedAt: new Date(),
  };

  if (data.id) {
    await db.update(vehicles).set(values).where(eq(vehicles.id, data.id));
    return data.id;
  } else {
    const [inserted] = await db.insert(vehicles).values(values).returning({ id: vehicles.id });
    return inserted.id;
  }
}

export async function deleteVehicleDb(id: string): Promise<void> {
  const db = getDb();
  await db.delete(vehicles).where(eq(vehicles.id, id));
}

export async function countVehiclesByPlateDb(
  plate: string,
  excludeId?: string,
): Promise<number> {
  const db = getDb();
  const normalized = plate.trim().toUpperCase();
  const rows = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.plate, normalized));
  return rows.filter((r) => r.id !== excludeId).length;
}

export async function assignVehicleToTransportDb(
  tx: any, // Accepts the transaction or db instance
  osId: string,
  vehicleId: string,
  driverId?: string | null,
): Promise<void> {
  const plate = await getVehiclePlateDb(vehicleId);
  const [existing] = await tx
    .select({ id: transportLogs.id })
    .from(transportLogs)
    .where(eq(transportLogs.idMedicao, osId))
    .limit(1);

  const values = {
    vehicleId,
    vehiclePlate: plate,
    driverId: driverId ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await tx
      .update(transportLogs)
      .set(values)
      .where(eq(transportLogs.id, existing.id));
  } else {
    await tx.insert(transportLogs).values({ idMedicao: osId, ...values });
  }
}
