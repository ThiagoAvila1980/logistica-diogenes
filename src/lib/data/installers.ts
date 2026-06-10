import { useMockData } from "./config";
import type { InstallerOption } from "./installers-db";

const DEMO_INSTALLER_ID = "a1000000-0000-4000-8000-000000000005";

const MOCK_INSTALLERS: InstallerOption[] = [
  { id: DEMO_INSTALLER_ID, name: "Instalador Demo" },
];

export async function listActiveInstallers(): Promise<InstallerOption[]> {
  if (useMockData()) return MOCK_INSTALLERS;
  const { listActiveInstallersDb } = await import("./installers-db");
  return listActiveInstallersDb();
}
