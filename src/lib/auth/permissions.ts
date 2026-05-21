import type { UserRole } from "@/db/schema";
import type { AdvanceTargetStatus } from "@/lib/workflow/advance-flow";

export type { UserRole };

export const ALL_USER_ROLES: readonly UserRole[] = [
  "admin",
  "gerente",
  "medidor",
  "cortador",
  "motorista",
  "instalador",
] as const;

/** Prefixos de rota permitidos por papel (além de exceções globais). */
export const ROLE_ROUTE_ACCESS: Record<UserRole, readonly string[]> = {
  admin: [
    "/dashboard",
    "/field",
    "/production",
    "/logistics",
    "/installation",
    "/admin",
  ],
  gerente: [
    "/dashboard",
    "/field",
    "/production",
    "/logistics",
    "/installation",
  ],
  medidor: ["/field"],
  cortador: ["/production"],
  motorista: ["/logistics"],
  instalador: ["/installation"],
};

const OS_DETAIL_PATTERN =
  /^\/dashboard\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_ROUTE_PRIORITY: readonly UserRole[] = [
  "admin",
  "gerente",
  "medidor",
  "cortador",
  "motorista",
  "instalador",
];

export function hasRole(
  roles: readonly UserRole[],
  role: UserRole,
): boolean {
  return roles.includes(role);
}

export function hasAnyRole(
  roles: readonly UserRole[],
  allowed: readonly UserRole[],
): boolean {
  return allowed.some((role) => roles.includes(role));
}

export function normalizeRoles(
  roles: readonly UserRole[] | UserRole | null | undefined,
): UserRole[] {
  if (!roles) return [];
  if (typeof roles === "string") return [roles];
  return [...roles];
}

function getDefaultRouteForSingleRole(role: UserRole): string {
  switch (role) {
    case "medidor":
      return "/field";
    case "cortador":
      return "/production";
    case "motorista":
      return "/logistics";
    case "instalador":
      return "/installation";
    default:
      return "/dashboard";
  }
}

export function getDefaultRouteForRoles(roles: readonly UserRole[]): string {
  for (const role of DEFAULT_ROUTE_PRIORITY) {
    if (hasRole(roles, role)) {
      return getDefaultRouteForSingleRole(role);
    }
  }
  return "/dashboard";
}

/** @deprecated Use getDefaultRouteForRoles */
export function getDefaultRouteForRole(role: UserRole): string {
  return getDefaultRouteForRoles([role]);
}

const ADMIN_ROUTE_PREFIX = "/admin";

export function isAdminOnlyPath(pathname: string): boolean {
  return (
    pathname === ADMIN_ROUTE_PREFIX ||
    pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`)
  );
}

/** Detalhe de OS no painel — operadores precisam avançar etapas via pipeline. */
export function isOsDetailPath(pathname: string): boolean {
  return OS_DETAIL_PATTERN.test(pathname);
}

function canAccessRouteForRole(role: UserRole, pathname: string): boolean {
  if (isAdminOnlyPath(pathname)) {
    return role === "admin";
  }

  if (role === "admin" || role === "gerente") {
    return true;
  }

  if (isOsDetailPath(pathname)) {
    return true;
  }

  const prefixes = ROLE_ROUTE_ACCESS[role];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canAccessRoute(
  roles: readonly UserRole[],
  pathname: string,
): boolean {
  return roles.some((role) => canAccessRouteForRole(role, pathname));
}

export function canViewAllOrders(roles: readonly UserRole[]): boolean {
  return hasAnyRole(roles, ["admin", "gerente"]);
}

export function canUseKanban(roles: readonly UserRole[]): boolean {
  return hasAnyRole(roles, ["admin", "gerente"]);
}

export function canPerformRevision(roles: readonly UserRole[]): boolean {
  return hasAnyRole(roles, ["admin", "gerente"]);
}

export function getAdvanceAllowedRoles(
  nextStatus: AdvanceTargetStatus,
): readonly UserRole[] {
  switch (nextStatus) {
    case "medicao_orcamento":
    case "medicao_final":
      return ["medidor", "gerente", "admin"];
    case "cortes":
    case "embalagem":
    case "acessorios_plano":
      return ["cortador", "gerente", "admin"];
    case "transporte_perfil":
    case "transporte_estrutural":
    case "transporte_perfis_total":
    case "transporte_acessorios":
    case "transporte_levar_vidro":
      return ["motorista", "gerente", "admin"];
    case "instalacao_estrutural":
    case "instalacao_vidros":
    case "concluido":
      return ["instalador", "gerente", "admin"];
    default:
      return ["gerente", "admin"];
  }
}

export function canAdvanceToStatus(
  roles: readonly UserRole[],
  nextStatus: AdvanceTargetStatus,
): boolean {
  return hasAnyRole(roles, getAdvanceAllowedRoles(nextStatus));
}

export type NavItem = {
  href: string;
  label: string;
  match: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Painel", match: "/dashboard" },
  { href: "/dashboard/kanban", label: "Kanban", match: "/dashboard/kanban" },
  { href: "/field", label: "Medições", match: "/field" },
  { href: "/production", label: "Corte", match: "/production" },
  { href: "/logistics", label: "Transporte", match: "/logistics" },
  { href: "/installation", label: "Instalação", match: "/installation" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/users", label: "Usuários", match: "/admin/users" },
  { href: "/admin/vehicles", label: "Veículos", match: "/admin/vehicles" },
];

export function getNavItemsForRoles(roles: readonly UserRole[]): NavItem[] {
  const seen = new Set<string>();
  const merged: NavItem[] = [];

  for (const role of roles) {
    const items = NAV_ITEMS.filter((item) => {
      if (item.match === "/dashboard/kanban" && !canUseKanban(roles)) {
        return false;
      }
      if (
        item.match === "/dashboard" &&
        !hasAnyRole(roles, ["admin", "gerente"])
      ) {
        return false;
      }
      return canAccessRouteForRole(role, item.match);
    });

    for (const item of items) {
      if (!seen.has(item.href)) {
        seen.add(item.href);
        merged.push(item);
      }
    }
  }

  const order = new Map(NAV_ITEMS.map((item, index) => [item.href, index]));
  merged.sort(
    (a, b) => (order.get(a.href) ?? 99) - (order.get(b.href) ?? 99),
  );

  if (hasRole(roles, "admin")) {
    return [...merged, ...ADMIN_NAV_ITEMS];
  }

  return merged;
}

/** @deprecated Use getNavItemsForRoles */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return getNavItemsForRoles([role]);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  medidor: "Medidor",
  cortador: "Cortador",
  motorista: "Motorista",
  instalador: "Instalador",
};

export function formatRolesLabel(roles: readonly UserRole[]): string {
  return roles.map((r) => ROLE_LABELS[r] ?? r).join(", ");
}

export function rolesEqual(
  a: readonly UserRole[],
  b: readonly UserRole[],
): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((role, i) => role === sortedB[i]);
}
