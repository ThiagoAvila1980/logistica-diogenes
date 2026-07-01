import type { DriverOption } from "./drivers-db";

export async function listActiveDrivers(): Promise<DriverOption[]> {
  const { listActiveDriversDb } = await import("./drivers-db");
  return listActiveDriversDb();
}
