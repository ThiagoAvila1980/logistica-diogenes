import type { InstallerOption } from "./installers-db";

export async function listActiveInstallers(): Promise<InstallerOption[]> {
  const { listActiveInstallersDb } = await import("./installers-db");
  return listActiveInstallersDb();
}
