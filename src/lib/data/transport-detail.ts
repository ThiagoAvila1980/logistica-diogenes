import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { transportLogs, vehicles, measurements } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import type { TransportSteps, CuttingSteps } from "@/lib/transport-gates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { aggregateCuttingStepsFromItems } from "@/lib/data/cutting-detail";

/**
 * Computa o aggregate de progresso de transporte a partir dos itens (vãos).
 *
 * - levarPerfilEstrutural → qualquer vão entregou perfil estrutural
 * - levarPerfilTotal      → todos os vãos entregaram perfis (embalagem)
 * - levarAcessorios       → todos os vãos entregaram acessórios
 * - levarVidros           → todos os vãos entregaram vidros
 * - transporteConcluido   → todas as 4 entregas acima completas
 */
export function aggregateTransportStepsFromItems(items: MeasurementLineItem[]): TransportSteps {
  if (!items.length) {
    return {
      levarPerfilEstrutural: false,
      levarPerfilTotal: false,
      levarAcessorios: false,
      levarVidros: false,
      transporteConcluido: false,
    };
  }

  const levarPerfilEstrutural = items.some((i) => i.transportProgress?.perfilEstrutural === true);
  const levarPerfilTotal = items.every((i) => i.transportProgress?.perfilTotal === true);
  const levarAcessorios = items.every((i) => i.transportProgress?.acessorios === true);
  const levarVidros = items.every((i) => i.transportProgress?.vidros === true);
  const transporteConcluido =
    levarPerfilEstrutural && levarPerfilTotal && levarAcessorios && levarVidros;

  return {
    levarPerfilEstrutural,
    levarPerfilTotal,
    levarAcessorios,
    levarVidros,
    transporteConcluido,
  };
}

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

  const isLatePhase =
    osStatus.startsWith("transporte_") ||
    osStatus.startsWith("instalacao") ||
    osStatus === "concluido";

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
  const computedCutting = aggregateCuttingStepsFromItems(items);
  const cuttingSteps: CuttingSteps = {
    corteFeito: computedCutting.corteFeito || isLatePhase,
    embalagemFeita: computedCutting.embalagemFeita || isLatePhase,
    acessoriosFeitos: computedCutting.acessoriosFeitos || isLatePhase,
    vidrosFeitos: computedCutting.vidrosFeitos || isLatePhase,
  };

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
