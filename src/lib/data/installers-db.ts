import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, installationLogs } from "@/db/schema";

export type InstallerOption = {
  id: string;
  name: string;
};

/** Lista todos os usuários ativos com papel "instalador". */
export async function listActiveInstallersDb(): Promise<InstallerOption[]> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id, name: users.name, roles: users.roles })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(users.name);

  return rows
    .filter((u) => u.roles.includes("instalador"))
    .map(({ id, name }) => ({ id, name }));
}

/** Atribui instalador e/ou data agendada ao installation_log de uma OS. */
export async function assignInstallerToInstallationDb(
  osId: string,
  installerId: string | null,
  scheduledInstallationDate: Date | null,
): Promise<void> {
  const db = getDb();

  const [existing] = await db
    .select({ id: installationLogs.id })
    .from(installationLogs)
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  const values = {
    installerId,
    scheduledInstallationDate,
  };

  if (existing) {
    await db
      .update(installationLogs)
      .set(values)
      .where(eq(installationLogs.id, existing.id));
  } else {
    await db.insert(installationLogs).values({ idMedicao: osId, ...values });
  }
}

/** Retorna installerId e scheduledInstallationDate para uma OS. */
export async function getInstallerAssignmentDb(osId: string): Promise<{
  installerId: string | null;
  installerName: string | null;
  scheduledInstallationDate: Date | null;
}> {
  const db = getDb();
  const [row] = await db
    .select({
      installerId: installationLogs.installerId,
      scheduledInstallationDate: installationLogs.scheduledInstallationDate,
      installerName: users.name,
    })
    .from(installationLogs)
    .leftJoin(users, eq(installationLogs.installerId, users.id))
    .where(eq(installationLogs.idMedicao, osId))
    .limit(1);

  return {
    installerId: row?.installerId ?? null,
    installerName: row?.installerName ?? null,
    scheduledInstallationDate: row?.scheduledInstallationDate ?? null,
  };
}
