import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { transportLogs, cuttingPlans, vehicles, measurements } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import type { TransportSteps, CuttingSteps } from "@/lib/transport-gates";

export type TransportDetail = {
  osId: string;
  osStatus: OsStatus;
  cliente: string | null;
  cuttingSteps: CuttingSteps;
  transportSteps: TransportSteps;
  vehicleId: string | null;
  vehiclePlate: string | null;
  vehicleDescription: string | null;
  routeNotes: string | null;
};

export type VehicleOption = {
  id: string;
  description: string;
  plate: string;
};

export async function getTransportDetailForOs(
  osId: string,
  osStatus: OsStatus,
): Promise<TransportDetail> {
  const db = getDb();

  const [meas, cutting, transport] = await Promise.all([
    db
      .select({ cliente: measurements.cliente })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1),
    db
      .select({
        corteFeito: cuttingPlans.corteFeito,
        embalagemFeita: cuttingPlans.embalagemFeita,
        acessoriosFeitos: cuttingPlans.acessoriosFeitos,
      })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1),
    db
      .select({
        vehicleId: transportLogs.vehicleId,
        vehiclePlate: transportLogs.vehiclePlate,
        vehicleDescription: vehicles.description,
        routeNotes: transportLogs.routeNotes,
        levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
        levarPerfilTotal: transportLogs.levarPerfilTotal,
        levarAcessorios: transportLogs.levarAcessorios,
        levarVidro: transportLogs.levarVidro,
        transporteConcluido: transportLogs.transporteConcluido,
      })
      .from(transportLogs)
      .leftJoin(vehicles, eq(transportLogs.vehicleId, vehicles.id))
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1),
  ]);

  const cut = cutting[0];
  const trans = transport[0];

  return {
    osId,
    osStatus,
    cliente: meas[0]?.cliente ?? null,
    cuttingSteps: {
      corteFeito:
        cut?.corteFeito ??
        (osStatus.startsWith("transporte_") ||
          osStatus.startsWith("instalacao") ||
          osStatus === "concluido"),
      embalagemFeita:
        cut?.embalagemFeita ??
        (osStatus.startsWith("transporte_") ||
          osStatus.startsWith("instalacao") ||
          osStatus === "concluido"),
      acessoriosFeitos:
        cut?.acessoriosFeitos ??
        (osStatus.startsWith("transporte_") ||
          osStatus.startsWith("instalacao") ||
          osStatus === "concluido"),
    },
    transportSteps: {
      levarPerfilEstrutural: trans?.levarPerfilEstrutural ?? false,
      levarPerfilTotal: trans?.levarPerfilTotal ?? false,
      levarAcessorios: trans?.levarAcessorios ?? false,
      levarVidro: trans?.levarVidro ?? false,
      transporteConcluido: trans?.transporteConcluido ?? false,
    },
    vehicleId: trans?.vehicleId ?? null,
    vehiclePlate: trans?.vehiclePlate ?? null,
    vehicleDescription: trans?.vehicleDescription ?? null,
    routeNotes: trans?.routeNotes ?? null,
  };
}

export async function listActiveVehicles(): Promise<VehicleOption[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: vehicles.id,
      description: vehicles.description,
      plate: vehicles.plate,
    })
    .from(vehicles)
    .where(eq(vehicles.active, true));

  return rows;
}
