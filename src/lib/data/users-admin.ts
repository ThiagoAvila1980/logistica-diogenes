import type { AdminUserRow } from "./users-admin-db";

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const { listAdminUsersDb } = await import("./users-admin-db");
  return listAdminUsersDb();
}

export type { AdminUserRow };
