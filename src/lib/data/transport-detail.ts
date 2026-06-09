import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { transportLogs, vehicles, measurements } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import type { TransportSteps, CuttingSteps } from "@/lib/transport-gates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import {
  aggregateCuttingStepsFromItems,
  aggregateTransportStepsFromItems,
  effectiveCuttingSteps,
  isTransportOrLater,
} from "@/lib/workflow/aggregates";

/**
 * @deprecated Importe de `@/lib/workflow/aggregates`.
 * Reexport mantido para compatibilidade com importadores existentes.
 */
export { aggregateTransportStepsFromItems };

export type TransportDetail = {
  osId: string;
  osStatus: OsStatus;
  cliente: string | null;
  items: MeasurementLineItem[];
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

  const isLatePhase = isTransportOrLater(osStatus);

  const [measRows, transport] = await Promise.all([
    db
      .select({ cliente: measurements.cliente, items: measurements.items })
      .from(measurements)
      .where(eq(measurements.id, osId))
      .limit(1),
    db
      .select({
        vehicleId: transportLogs.vehicleId,
        vehiclePlate: vehicles.plate,
        vehicleDescription: vehicles.description,
        routeNotes: transportLogs.routeNotes,
        // campos legados mantidos para compatibilidade com installation gates
        levarPerfilEstrutural: transportLogs.levarPerfilEstrutural,
        levarPerfilTotal: transportLogs.levarPerfilTotal,
        levarAcessorios: transportLogs.levarAcessorios,
        levarVidros: transportLogs.levarVidros,
        transporteConcluido: transportLogs.transporteConcluido,
      })
      .from(transportLogs)
      .leftJoin(vehicles, eq(transportLogs.vehicleId, vehicles.id))
      .where(eq(transportLogs.idMedicao, osId))
      .limit(1),
  ]);

  const meas = measRows[0];
  const trans = transport[0];
  const items = (meas?.items as MeasurementLineItem[]) ?? [];

  // Compute aggregate cutting steps
  const cuttingSteps: CuttingSteps = effectiveCuttingSteps(
    aggregateCuttingStepsFromItems(items),
    isLatePhase,
  );

  // Compute aggregate transport steps from items (source of truth)
  // Fallback to transport_logs values for data saved before this migration
  const computedTransport = aggregateTransportStepsFromItems(items);
  const hasPerVaoData = items.some((i) => i.transportProgress !== undefined);

  const transportSteps: TransportSteps = hasPerVaoData
    ? computedTransport
    : {
        levarPerfilEstrutural: trans?.levarPerfilEstrutural ?? false,
        levarPerfilTotal: trans?.levarPerfilTotal ?? false,
        levarAcessorios: trans?.levarAcessorios ?? false,
        levarVidros: trans?.levarVidros ?? false,
        transporteConcluido: trans?.transporteConcluido ?? false,
      };

  return {
    osId,
    osStatus,
    cliente: meas?.cliente ?? null,
    items,
    cuttingSteps,
    transportSteps,
    vehicleId: trans?.vehicleId ?? null,
    vehiclePlate: trans?.vehicleId ? (trans?.vehiclePlate ?? null) : null,
    vehicleDescription: trans?.vehicleId
      ? (trans?.vehicleDescription ?? null)
      : null,
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
