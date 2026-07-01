import "server-only";

import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { transportLogs, vehicles, users, measurements } from "@/db/schema";
import {
  computeLogisticsReport,
  type LogisticsReportPayload,
} from "@/lib/reports/logistics-compute";

export type VehicleStats = {
  vehicleId: string;
  description: string;
  plate: string;
  totalDeliveries: number;
  completedDeliveries: number;
};

export type DriverStats = {
  driverId: string;
  name: string;
  totalDeliveries: number;
  completedDeliveries: number;
  vehicles: string[];
};

export type SubstepStats = {
  label: string;
  done: number;
  total: number;
  pct: number;
};

export type LogisticsReportData = {
  vehicles: VehicleStats[];
  drivers: DriverStats[];
  substepStats: SubstepStats[];
  pendingTransport: number;
  generatedAt: string;
};

export type { LogisticsReportPayload } from "@/lib/reports/logistics-compute";

async function getLogisticsReportPayloadDb(): Promise<LogisticsReportPayload> {
  const db = getDb();

  const [allTransports, allVehicles, allDrivers, pendingCount] =
    await Promise.all([
      db
        .select({
          id: transportLogs.id,
          driverId: transportLogs.driverId,
          vehicleId: transportLogs.vehicleId,
          vehiclePlate: transportLogs.vehiclePlate,
          transporteConcluido: transportLogs.transporteConcluido,
          levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
          levarPerfilTotal: transportLogs.levarPerfilTotal,
          levarAcessorios: transportLogs.levarAcessorios,
          levarVidros: transportLogs.levarVidros,
          createdAt: transportLogs.createdAt,
        })
        .from(transportLogs),

      db
        .select({ id: vehicles.id, description: vehicles.description, plate: vehicles.plate })
        .from(vehicles)
        .where(eq(vehicles.active, true)),

      db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.active, true)),

      db
        .select({ cnt: count(measurements.id) })
        .from(measurements)
        .where(eq(measurements.etapa, "transporte_perfil")),
    ]);

  const vehicleMap = new Map(
    allVehicles.map((v) => [v.id, { description: v.description, plate: v.plate }]),
  );
  const driverMap = new Map(allDrivers.map((u) => [u.id, u.name]));

  const deliveries = allTransports.map((t) => {
    const vehicle = t.vehicleId ? vehicleMap.get(t.vehicleId) : null;
    return {
      id: t.id,
      driverId: t.driverId,
      driverName: t.driverId ? (driverMap.get(t.driverId) ?? "—") : "—",
      vehicleId: t.vehicleId,
      vehicleDescription: vehicle?.description ?? t.vehiclePlate ?? "—",
      vehiclePlate: vehicle?.plate ?? t.vehiclePlate ?? "—",
      createdAt: t.createdAt,
      transporteConcluido: t.transporteConcluido,
      levarPerfilEstrutural: t.levarPerfilEstrutural,
      levarPerfilTotal: t.levarPerfilTotal,
      levarAcessorios: t.levarAcessorios,
      levarVidros: t.levarVidros,
    };
  });

  return {
    deliveries,
    vehicles: allVehicles.map((v) => ({
      vehicleId: v.id,
      description: v.description,
      plate: v.plate,
      totalDeliveries: 0,
      completedDeliveries: 0,
    })),
    pendingTransport: Number(pendingCount[0]?.cnt ?? 0),
  };
}

export async function getLogisticsReportPayload(): Promise<LogisticsReportPayload> {
  return getLogisticsReportPayloadDb();
}

export async function getLogisticsReport(): Promise<LogisticsReportData> {
  const payload = await getLogisticsReportPayload();
  return computeLogisticsReport(payload);
}
