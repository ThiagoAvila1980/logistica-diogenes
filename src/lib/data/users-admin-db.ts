import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import type { AdminUserRow } from "./admin-mock-store";

export async function listAdminUsersDb(): Promise<AdminUserRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roles: users.roles,
      phone: users.phone,
      active: users.active,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return rows.map((r) => ({
    ...r,
    phone: r.phone ?? null,
  }));
}

export async function createUserDb(data: {
  name: string;
  email: string;
  roles: AdminUserRow["roles"];
  phone?: string | null;
  passwordHash: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(users).values({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    roles: data.roles,
    phone: data.phone?.trim() ?? null,
    passwordHash: data.passwordHash,
    active: true,
  });
}

export async function updateUserDb(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    roles: AdminUserRow["roles"];
    phone: string | null;
    active: boolean;
    passwordHash: string;
  }>,
): Promise<void> {
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name != null) patch.name = data.name.trim();
  if (data.email != null) patch.email = data.email.trim().toLowerCase();
  if (data.roles != null) patch.roles = data.roles;
  if (data.phone !== undefined) patch.phone = data.phone;
  if (data.active != null) patch.active = data.active;
  if (data.passwordHash) patch.passwordHash = data.passwordHash;
  await db.update(users).set(patch).where(eq(users.id, id));
}

export async function countUsersByEmailDb(
  email: string,
  excludeId?: string,
): Promise<number> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized));
  return rows.filter((r) => r.id !== excludeId).length;
}

export async function deleteUserDb(id: string): Promise<void> {
  const db = getDb();
  await db.delete(users).where(eq(users.id, id));
}

export async function countAdminUsersDb(excludeId?: string): Promise<number> {
  const rows = await listAdminUsersDb();
  return rows.filter(
    (u) => u.id !== excludeId && u.roles.includes("admin"),
  ).length;
}
