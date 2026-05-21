import { useMockData } from "./config";
import {
  initMockAdminUsers,
  userMockStore,
  type AdminUserRow,
} from "./admin-mock-store";
import { DEMO_USERS } from "@/lib/auth/demo-users";

function ensureMockUsers() {
  initMockAdminUsers(
    DEMO_USERS.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      roles: u.roles,
      phone: null,
      active: true,
    })),
  );
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  if (useMockData()) {
    ensureMockUsers();
    return userMockStore.list();
  }
  const { listAdminUsersDb } = await import("./users-admin-db");
  return listAdminUsersDb();
}

export type { AdminUserRow };
