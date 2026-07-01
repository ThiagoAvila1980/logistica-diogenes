import type { VehicleOptionForSelection, VehicleRow } from "./vehicles-db";

export type VehicleOption = {
  id: string;
  description: string;
  plate: string;
};

export async function listVehicles(): Promise<VehicleRow[]> {
  const { listVehiclesDb } = await import("./vehicles-db");
  return listVehiclesDb();
}

export async function listActiveVehiclesForTransport(): Promise<
  VehicleOption[]
> {
  const { listActiveVehiclesDb } = await import("./vehicles-db");
  return listActiveVehiclesDb();
}

export async function listVehiclesForTransportSelection(
  osId: string,
): Promise<VehicleOptionForSelection[]> {
  const { listVehiclesForTransportSelectionDb } = await import("./vehicles-db");
  return listVehiclesForTransportSelectionDb(osId);
}

export async function resolveVehiclePlate(
  vehicleId: string,
): Promise<string | null> {
  const { getVehiclePlateDb } = await import("./vehicles-db");
  return getVehiclePlateDb(vehicleId);
}
