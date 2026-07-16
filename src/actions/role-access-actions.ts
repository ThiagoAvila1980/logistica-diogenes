"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { saveRoleScreenMatrix } from "@/lib/auth/role-access";
import { SCREEN_KEYS, type ScreenKey } from "@/lib/auth/screens";
import type { UserRole } from "@/db/schema";
import { logger } from "@/lib/logger";
import { getDb } from "@/db";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

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
    let cellCount = 0;
    for (const role in updates) {
      cellCount += updates[role as keyof typeof updates]?.length ?? 0;
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await saveRoleScreenMatrix(updates, tx);

      await recordAuditEvent(tx, {
        action: AUDIT_ACTIONS.ADMIN_ROLE_ACCESS_UPDATED,
        entityType: "role_screen",
        entityId: "matrix",
        actorId: session.userId,
        payload: { cellCount },
      });
    });

    revalidatePath("/admin/permissions");
    return { success: true, message: "Permissões salvas com sucesso." };
  } catch (err) {
    logger.error("saveRoleAccessMatrix failed", { err });
    return { success: false, message: "Erro ao salvar permissões. Tente novamente." };
  }
}
