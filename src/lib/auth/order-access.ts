import type { OsStatus } from "@/db/schema";
import { osStatus } from "@/db/schema";
import type { SessionUser } from "./session-types";
import type { UserRole } from "./permissions";
import { canViewAllOrders, hasAnyRole } from "./permissions";

const ALL_OS_STATUSES = osStatus.enumValues;

export type OrderAccessFields = {
  assignedUserId: string | null;
  status: OsStatus;
};

/** Status visíveis no módulo de cada operador (alinhado aos filtros das páginas). */
export function isStatusVisibleToRole(
  role: UserRole,
  status: OsStatus,
): boolean {
  if (canViewAllOrders([role])) return true;

  switch (role) {
    case "medidor":
      return status.startsWith("medicao");
    case "cortador":
      return (
        status === "cortes" ||
        status === "embalagem" ||
        status === "acessorios_plano" ||
        status.includes("corte")
      );
    case "motorista":
      return status.startsWith("transporte_") || status.includes("transporte");
    case "instalador":
      return status.startsWith("instalacao") || status === "concluido";
    default:
      return false;
  }
}

export function isStatusVisibleToRoles(
  roles: readonly UserRole[],
  status: OsStatus,
): boolean {
  if (canViewAllOrders(roles)) return true;
  return roles.some((role) => isStatusVisibleToRole(role, status));
}

/** Lista de status para filtro SQL (operadores). Admin/gerente retorna null = sem filtro. */
export function getVisibleStatusesForRoles(
  roles: readonly UserRole[],
): OsStatus[] | null {
  if (canViewAllOrders(roles)) return null;
  return ALL_OS_STATUSES.filter((status) =>
    isStatusVisibleToRoles(roles, status),
  );
}

/**
 * Operador vê OS atribuída a si ou sem responsável (pool).
 * Admin/gerente veem todas.
 * Instalador vê todas as OSs em fase de instalação/concluído.
 */
export function canAccessOrder(
  session: SessionUser,
  order: OrderAccessFields,
): boolean {
  if (canViewAllOrders(session.roles)) return true;

  if (hasAnyRole(session.roles, ["instalador"])) {
    return isStatusVisibleToRoles(session.roles, order.status);
  }

  const assigned =
    order.assignedUserId === null || order.assignedUserId === session.userId;
  if (!assigned) return false;

  return isStatusVisibleToRoles(session.roles, order.status);
}

export function filterOrdersForSession<T extends OrderAccessFields>(
  orders: T[],
  session: SessionUser | null,
): T[] {
  if (!session) return [];
  if (canViewAllOrders(session.roles)) return orders;

  return orders.filter((order) => canAccessOrder(session, order));
}

/** @deprecated Use getVisibleStatusesForRoles */
export function getVisibleStatusesForRole(
  role: UserRole,
): OsStatus[] | null {
  return getVisibleStatusesForRoles([role]);
}
