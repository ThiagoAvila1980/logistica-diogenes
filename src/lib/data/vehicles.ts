import { useMockData } from "./config";
import { vehicleMockStore, type VehicleRow } from "./admin-mock-store";
import type { VehicleOptionForSelection } from "./vehicles-db";

export type VehicleOption = {
  id: string;
  description: string;
  plate: string;
};

export async function listVehicles(): Promise<VehicleRow[]> {
  if (useMockData()) return vehicleMockStore.list();
  const { listVehiclesDb } = await import("./vehicles-db");
  return listVehiclesDb();
}

export async function listActiveVehiclesForTransport(): Promise<
  VehicleOption[]
> {
  if (useMockData()) {
    return vehicleMockStore.listActive().map(({ id, description, plate }) => ({
      id,
      description,
      plate,
    }));
  }
  const { listActiveVehiclesDb } = await import("./vehicles-db");
  return listActiveVehiclesDb();
}

export async function listVehiclesForTransportSelection(
  osId: string,
): Promise<VehicleOptionForSelection[]> {
  if (useMockData()) {
    return vehicleMockStore.listActive().map(({ id, description, plate }) => ({
      id,
      description,
      plate,
      unavailable: vehicleMockStore.isInUseByOtherOs(osId, id),
    }));
  }
  const { listVehiclesForTransportSelectionDb } = await import("./vehicles-db");
  return listVehiclesForTransportSelectionDb(osId);
}

export async function resolveVehiclePlate(
  vehicleId: string,
): Promise<string | null> {
  if (useMockData()) return vehicleMockStore.getPlate(vehicleId);
  const { getVehiclePlateDb } = await import("./vehicles-db");
  return getVehiclePlateDb(vehicleId);
}
