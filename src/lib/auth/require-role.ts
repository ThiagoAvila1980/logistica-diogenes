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

export async function requireRole(
  allowed: readonly UserRole[],
): Promise<SessionUser> {
  const session = await requireSession();
  if (!hasAnyRole(session.roles, allowed)) {
    throw new AuthError("FORBIDDEN", "Sem permissão para esta ação");
  }
  return session;
}
