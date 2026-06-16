import { useMockData } from "./config";
import type { DriverOption } from "./drivers-db";
import { DEMO_USERS } from "@/lib/auth/demo-users";

export async function listActiveDrivers(): Promise<DriverOption[]> {
  if (useMockData()) {
    return DEMO_USERS.filter((u) => u.roles.includes("motorista")).map(
      ({ id, name }) => ({ id, name }),
    );
  }
  const { listActiveDriversDb } = await import("./drivers-db");
  return listActiveDriversDb();
}
