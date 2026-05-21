import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { vehicles, transportLogs, serviceOrders } from "@/db/schema";
import type { VehicleRow } from "./admin-mock-store";

const ACTIVE_TRANSPORT_STATUSES = [
  "transporte_perfil",
  "transporte_estrutural",
  "transporte_perfis_total",
  "transporte_acessorios",
  "transporte_levar_vidro",
  "em_transporte",
] as const;

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

  const inUseRows = await db
    .select({ vehicleId: transportLogs.vehicleId })
    .from(transportLogs)
    .innerJoin(serviceOrders, eq(transportLogs.osId, serviceOrders.id))
    .where(inArray(serviceOrders.status, [...ACTIVE_TRANSPORT_STATUSES]));

  const inUseSet = new Set(
    inUseRows.map((r) => r.vehicleId).filter(Boolean) as string[],
  );

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
  const db = getDb();
  const [row] = await db
    .select({ id: transportLogs.id })
    .from(transportLogs)
    .innerJoin(serviceOrders, eq(transportLogs.osId, serviceOrders.id))
    .where(
      and(
        eq(transportLogs.vehicleId, vehicleId),
        inArray(serviceOrders.status, [...ACTIVE_TRANSPORT_STATUSES]),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function upsertVehicleDb(data: {
  id?: string;
  description: string;
  plate: string;
  active?: boolean;
}): Promise<void> {
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
  } else {
    await db.insert(vehicles).values(values);
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
  osId: string,
  vehicleId: string,
  driverId?: string | null,
): Promise<void> {
  const db = getDb();
  const plate = await getVehiclePlateDb(vehicleId);
  const [existing] = await db
    .select({ id: transportLogs.id })
    .from(transportLogs)
    .where(eq(transportLogs.osId, osId))
    .limit(1);

  const values = {
    vehicleId,
    vehiclePlate: plate,
    driverId: driverId ?? null,
    status: "em_transito" as const,
    departureAt: new Date(),
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(transportLogs)
      .set(values)
      .where(eq(transportLogs.id, existing.id));
  } else {
    await db.insert(transportLogs).values({ osId, ...values });
  }
}
