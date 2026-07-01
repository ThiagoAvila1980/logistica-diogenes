import { getSession } from "./session";
import type { SessionUser } from "./session-types";
import type { UserRole } from "./permissions";
import { hasAnyRole } from "./permissions";
import { AuthError } from "./auth-error";

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("UNAUTHORIZED", "Faça login para continuar");
  }
  return session;
}

/**
 * Revogação server-side: garante que o usuário da sessão ainda existe e está
 * ativo. Como roles e status vivem no cookie assinado, sem esta checagem um
 * usuário desativado continuaria operando até a sessão expirar.
 */
async function assertUserActive(userId: string): Promise<void> {
  const { getDb } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const db = getDb();
  const [row] = await db
    .select({ active: users.active })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row?.active) {
    throw new AuthError("UNAUTHORIZED", "Conta inativa. Faça login novamente.");
  }
}

export async function requireRole(
  allowed: readonly UserRole[],
): Promise<SessionUser> {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, allowed)) {
    throw new AuthError("FORBIDDEN", "Sem permissão para esta ação");
  }
  await assertUserActive(session.userId);
  return session;
}

/** Verifica role apenas pelo cookie, sem query ao banco. Usar em actions de leitura. */
export async function requireRoleFromSession(
  allowed: readonly UserRole[],
): Promise<SessionUser> {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, allowed)) {
    throw new AuthError("FORBIDDEN", "Sem permissão para esta ação");
  }
  return session;
}
