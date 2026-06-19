import type { UserRole } from "@/db/schema";
import { canAccessRoute, getDefaultRouteForRoles } from "./permissions";

/** Evita open redirect — só paths internos permitidos aos papéis. (versão estática, Edge-safe) */
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

/**
 * Versão dinâmica (Node/server-only): usa a matriz do banco para calcular
 * a rota padrão e validar o parâmetro `next`.
 */
export async function resolvePostLoginPathDynamic(
  next: string | null | undefined,
  roles: readonly UserRole[],
): Promise<string> {
  const { getRoleScreenMatrix, canAccessRouteDynamic, getDefaultRouteDynamic } =
    await import("@/lib/auth/role-access");

  const matrix = await getRoleScreenMatrix();
  const defaultRoute = getDefaultRouteDynamic(roles, matrix);

  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return defaultRoute;
  }
  if (next.startsWith("/login") || next.startsWith("/unauthorized")) {
    return defaultRoute;
  }
  if (!canAccessRouteDynamic(roles, next, matrix)) {
    return defaultRoute;
  }
  return next;
}
