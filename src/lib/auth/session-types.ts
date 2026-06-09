import type { UserRole } from "@/db/schema";

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  roles: UserRole[];
};

export const SESSION_COOKIE = "fluxo_session";

/** Tempo de vida da sessão (segundos). Alinhado ao maxAge do cookie. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
