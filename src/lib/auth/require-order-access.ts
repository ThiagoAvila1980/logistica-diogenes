import { getSession } from "./session";
import { AuthError } from "./auth-error";
import { canAccessOrder, type OrderAccessFields } from "./order-access";

export async function requireOrderAccess(
  order: OrderAccessFields,
): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("UNAUTHORIZED", "Sessão expirada. Faça login novamente.");
  }
  if (!canAccessOrder(session, order)) {
    throw new AuthError("FORBIDDEN", "Você não tem acesso a esta OS.");
  }
}
