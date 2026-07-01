/**
 * Acesso dinâmico a telas por papel — lê a matriz `role_screen_access` do
 * banco (com cache TTL) e expõe helpers para enforcement e navegação.
 *
 * Este módulo é server-only (Node). NÃO importar no middleware Edge.
 */
import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roleScreenAccess } from "@/db/schema";
import type { UserRole } from "@/db/schema";
import {
  ROLE_ROUTE_ACCESS,
  isAdminOnlyPath,
  type NavItem,
  NAV_ITEMS,
} from "@/lib/auth/permissions";
import { SCREENS, screenForPathname, type ScreenKey } from "@/lib/auth/screens";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Matriz: para cada papel, conjunto de screenKeys habilitadas. */
export type RoleScreenMatrix = Record<UserRole, Set<ScreenKey>>;

// ─── Cache em memória ─────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;

let cachedMatrix: RoleScreenMatrix | null = null;
let cacheAt = 0;

export function invalidateRoleScreenCache(): void {
  cachedMatrix = null;
  cacheAt = 0;
}

// ─── Defaults (espelham ROLE_ROUTE_ACCESS do código) ─────────────────────────

function buildDefaultMatrix(): RoleScreenMatrix {
  const matrix = {} as RoleScreenMatrix;
  const roles: UserRole[] = ["admin", "gerente", "medidor", "cortador", "motorista", "instalador"];

  for (const role of roles) {
    const allowed = ROLE_ROUTE_ACCESS[role] as readonly string[];
    const set = new Set<ScreenKey>();

    for (const screen of SCREENS) {
      const routePrefix = screen.route;
      if (allowed.some((p) => p === routePrefix || routePrefix.startsWith(p))) {
        set.add(screen.key);
      }
    }
    matrix[role] = set;
  }

  // admin sempre tudo
  matrix["admin"] = new Set(SCREENS.map((s) => s.key));
  return matrix;
}

// ─── Leitura da matriz ────────────────────────────────────────────────────────

/**
 * Retorna a matriz papel→telas habilitadas.
 * Lê `role_screen_access`, cacheia por `CACHE_TTL_MS`.
 */
export async function getRoleScreenMatrix(): Promise<RoleScreenMatrix> {
  const now = Date.now();
  if (cachedMatrix && now - cacheAt < CACHE_TTL_MS) {
    return cachedMatrix;
  }

  const db = getDb();
  const rows = await db
    .select({ role: roleScreenAccess.role, screen: roleScreenAccess.screen, enabled: roleScreenAccess.enabled })
    .from(roleScreenAccess);

  const matrix = buildDefaultMatrix();

  // Aplica os valores do banco sobre os defaults
  for (const row of rows) {
    const role = row.role as UserRole;
    if (role === "admin") continue; // admin sempre tudo
    if (!matrix[role]) matrix[role] = new Set();

    const key = row.screen as ScreenKey;
    if (row.enabled) {
      matrix[role].add(key);
    } else {
      matrix[role].delete(key);
    }
  }

  // admin sempre tem tudo
  matrix["admin"] = new Set(SCREENS.map((s) => s.key));

  cachedMatrix = matrix;
  cacheAt = now;
  return matrix;
}

/**
 * Persiste a matriz no banco, invalidando o cache.
 * Recebe o mapa completo de `role -> screenKey[]` (habilitadas).
 */
export async function saveRoleScreenMatrix(
  updates: Partial<Record<Exclude<UserRole, "admin">, ScreenKey[]>>,
): Promise<void> {
  const db = getDb();

  const roles = Object.keys(updates) as Exclude<UserRole, "admin">[];

  for (const role of roles) {
    const enabledKeys = new Set(updates[role] ?? []);

    for (const screen of SCREENS) {
      await db
        .insert(roleScreenAccess)
        .values({
          role,
          screen: screen.key,
          enabled: enabledKeys.has(screen.key),
        })
        .onConflictDoUpdate({
          target: [roleScreenAccess.role, roleScreenAccess.screen],
          set: {
            enabled: enabledKeys.has(screen.key),
            updatedAt: new Date(),
          },
        });
    }
  }

  invalidateRoleScreenCache();
}

// ─── Helpers de acesso dinâmico ───────────────────────────────────────────────

function roleCanAccessScreen(
  role: UserRole,
  pathname: string,
  matrix: RoleScreenMatrix,
): boolean {
  if (isAdminOnlyPath(pathname)) return role === "admin";
  if (role === "admin") return true;

  const screen = screenForPathname(pathname);
  if (!screen) return false;

  return matrix[role]?.has(screen.key) ?? false;
}

/** Verifica se qualquer um dos papéis permite o acesso ao pathname. */
export function canAccessRouteDynamic(
  roles: readonly UserRole[],
  pathname: string,
  matrix: RoleScreenMatrix,
): boolean {
  return roles.some((role) => roleCanAccessScreen(role, pathname, matrix));
}

/** Monta os itens de navegação com base na matriz dinâmica. */
export function getNavItemsForRolesDynamic(
  roles: readonly UserRole[],
  matrix: RoleScreenMatrix,
): NavItem[] {
  const seen = new Set<string>();
  const merged: NavItem[] = [];

  for (const role of roles) {
    const items = NAV_ITEMS.filter((item) => {
      if (item.match === "/dashboard" && !roles.includes("admin")) {
        return false;
      }
      return roleCanAccessScreen(role, item.match, matrix);
    });

    for (const item of items) {
      if (!seen.has(item.href)) {
        seen.add(item.href);
        merged.push(item);
      }
    }
  }

  // Mantém a ordem original de NAV_ITEMS
  const order = new Map(NAV_ITEMS.map((item, idx) => [item.href, idx]));
  merged.sort((a, b) => (order.get(a.href) ?? 99) - (order.get(b.href) ?? 99));

  return merged;
}

/** Exibe a seção Administrativo no menu quando o papel tem a tela habilitada. */
export function canSeeAdministrativeNav(
  roles: readonly UserRole[],
  matrix: RoleScreenMatrix,
): boolean {
  if (roles.includes("admin")) return true;
  return roles.some((role) => matrix[role]?.has("administrative") ?? false);
}

/**
 * Retorna a rota padrão pós-login com base na matriz dinâmica.
 * Segue a prioridade: admin > gerente > medidor > cortador > motorista > instalador.
 * Retorna "/unauthorized" se nenhuma tela estiver habilitada.
 */
export function getDefaultRouteDynamic(
  roles: readonly UserRole[],
  matrix: RoleScreenMatrix,
): string {
  const PRIORITY: UserRole[] = ["admin", "gerente", "medidor", "cortador", "motorista", "instalador"];

  for (const role of PRIORITY) {
    if (!roles.includes(role)) continue;

    if (role === "admin") return "/dashboard";

    const enabledScreens = matrix[role];
    if (!enabledScreens || enabledScreens.size === 0) continue;

    // Retorna a primeira tela habilitada na ordem do SCREENS
    for (const screen of SCREENS) {
      if (enabledScreens.has(screen.key)) return screen.route;
    }
  }

  return "/unauthorized";
}

/** Lê a matriz completa para exibição no painel admin. */
export async function getRoleScreenMatrixForAdmin(): Promise<
  Record<Exclude<UserRole, "admin">, Record<ScreenKey, boolean>>
> {
  const matrix = await getRoleScreenMatrix();
  const roles: Exclude<UserRole, "admin">[] = ["gerente", "medidor", "cortador", "motorista", "instalador"];

  const result = {} as Record<Exclude<UserRole, "admin">, Record<ScreenKey, boolean>>;

  for (const role of roles) {
    result[role] = {} as Record<ScreenKey, boolean>;
    for (const screen of SCREENS) {
      result[role][screen.key] = matrix[role]?.has(screen.key) ?? false;
    }
  }

  return result;
}
