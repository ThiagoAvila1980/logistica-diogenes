import type { UserRole } from "@/db/schema";
import { ALL_USER_ROLES, normalizeRoles } from "@/lib/auth/permissions";
import type { SessionUser } from "./session-types";

const VALID_ROLES = new Set<string>(ALL_USER_ROLES);

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && VALID_ROLES.has(value);
}

/** Aceita sessão nova (roles[]) e legada (role único). */
export function parseSessionPayload(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== "object") return null;

  const user = raw as Record<string, unknown>;
  if (
    typeof user.userId !== "string" ||
    typeof user.name !== "string" ||
    typeof user.email !== "string"
  ) {
    return null;
  }

  // Expiração obrigatória: tokens sem `exp` válido ou expirados são rejeitados.
  // Sessões antigas (pré-expiração) caem aqui e forçam novo login.
  const exp = typeof user.exp === "number" ? user.exp : null;
  if (exp === null || exp * 1000 <= Date.now()) {
    return null;
  }

  let roles: UserRole[] = [];

  if (Array.isArray(user.roles)) {
    roles = user.roles.filter(isValidRole);
  } else if (isValidRole(user.role)) {
    roles = [user.role];
  }

  roles = normalizeRoles(roles);
  if (roles.length === 0) return null;

  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    roles,
  };
}
