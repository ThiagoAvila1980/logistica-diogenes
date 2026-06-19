"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { useMockData } from "@/lib/data/config";
import { saveRoleScreenMatrix, invalidateRoleScreenCache } from "@/lib/auth/role-access";
import type { ScreenKey } from "@/lib/auth/screens";
import type { UserRole } from "@/db/schema";

export type RoleAccessActionResult =
  | { success: true }
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
  try {
    await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Acesso negado" };
  }

  if (useMockData()) {
    invalidateRoleScreenCache();
    revalidatePath("/admin/permissions");
    return { success: true };
  }

  const updates: Partial<Record<Exclude<UserRole, "admin">, ScreenKey[]>> = {};

  for (const role of CONFIGURABLE_ROLES) {
    const enabled: ScreenKey[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === `${role}:dashboard`    && value === "on") enabled.push("dashboard");
      if (key === `${role}:field`        && value === "on") enabled.push("field");
      if (key === `${role}:production`   && value === "on") enabled.push("production");
      if (key === `${role}:logistics`    && value === "on") enabled.push("logistics");
      if (key === `${role}:installation` && value === "on") enabled.push("installation");
      if (key === `${role}:concluded`    && value === "on") enabled.push("concluded");
    }
    updates[role] = enabled;
  }

  await saveRoleScreenMatrix(updates);
  revalidatePath("/admin/permissions");
  return { success: true };
}
