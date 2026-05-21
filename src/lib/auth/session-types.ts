import type { UserRole } from "@/db/schema";

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  roles: UserRole[];
};

export const SESSION_COOKIE = "fluxo_session";
