import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export type DriverOption = {
  id: string;
  name: string;
};

/** Lista todos os usuários ativos com papel "motorista". */
export async function listActiveDriversDb(): Promise<DriverOption[]> {
  const db = getDb();
  const rows = await db
    .select({ id: users.id, name: users.name, roles: users.roles })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(users.name);

  return rows
    .filter((u) => u.roles.includes("motorista"))
    .map(({ id, name }) => ({ id, name }));
}
