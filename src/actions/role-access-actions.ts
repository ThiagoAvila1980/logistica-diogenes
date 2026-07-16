"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { saveRoleScreenMatrix } from "@/lib/auth/role-access";
import { SCREEN_KEYS, type ScreenKey } from "@/lib/auth/screens";
import type { UserRole } from "@/db/schema";
import { logger } from "@/lib/logger";

export type RoleAccessActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

const CONFIGURABLE_ROLES: Exclude<UserRole, "admin">[] = [
  "gerente",
  "medidor",
  "cortador",
  "motorista",
  "instalador",
];

/**
 * Persiste a matriz de telas por papel.
 * FormData format: `${role}:${screenKey}` = "on" para habilitado.
 */
export async function saveRoleAccessMatrix(
  formData: FormData,
): Promise<RoleAccessActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Acesso negado" };
  }

  const updates: Partial<Record<Exclude<UserRole, "admin">, ScreenKey[]>> = {};

  for (const role of CONFIGURABLE_ROLES) {
    const enabled: ScreenKey[] = [];
    for (const screenKey of SCREEN_KEYS) {
      if (formData.get(`${role}:${screenKey}`) === "on") {
        enabled.push(screenKey);
      }
    }
    updates[role] = enabled;
  }

  try {
    await saveRoleScreenMatrix(updates);

    let cellCount = 0;
    for (const role in updates) {
      cellCount += updates[role as keyof typeof updates]?.length ?? 0;
    }

    const { recordAuditEvent, AUDIT_ACTIONS } = await import("@/lib/audit/audit-logger");
    await recordAuditEvent({
      action: AUDIT_ACTIONS.ADMIN_ROLE_ACCESS_UPDATED,
      entityType: "system",
      entityId: "role_access",
      actorId: session.userId,
      payload: { cellCount },
    });

    revalidatePath("/admin/permissions");
    return { success: true, message: "Permissões salvas com sucesso." };
  } catch (err) {
    logger.error("saveRoleAccessMatrix failed", { err });
    return { success: false, message: "Erro ao salvar permissões. Tente novamente." };
  }
}
