import type { UserRole } from "@/db/schema";
import { canAccessRoute, getDefaultRouteForRoles } from "./permissions";

/** Evita open redirect — só paths internos permitidos aos papéis. */
export function resolvePostLoginPath(
  next: string | null | undefined,
  roles: readonly UserRole[],
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return getDefaultRouteForRoles(roles);
  }
  if (next.startsWith("/login") || next.startsWith("/unauthorized")) {
    return getDefaultRouteForRoles(roles);
  }
  if (!canAccessRoute(roles, next)) {
    return getDefaultRouteForRoles(roles);
  }
  return next;
}
