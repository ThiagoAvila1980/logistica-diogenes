import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

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
