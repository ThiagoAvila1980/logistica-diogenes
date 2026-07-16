"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { rolesEqual } from "@/lib/auth/permissions";
import type { UserRole } from "@/db/schema";
import { listAdminUsers } from "@/lib/data/users-admin";
import type { AdminActionResult } from "@/actions/vehicle-actions";

const roleEnum = z.enum([
  "admin",
  "gerente",
  "medidor",
  "cortador",
  "motorista",
  "instalador",
] as const);

const rolesField = z
  .array(roleEnum)
  .min(1, "Selecione ao menos um papel")
  .transform((roles) => [...new Set(roles)]);

function parseRolesFromForm(formData: FormData): string[] {
  const fromGetAll = formData.getAll("roles").map(String);
  if (fromGetAll.length > 0) return fromGetAll;
  const single = formData.get("role");
  return single ? [String(single)] : [];
}

const createUserSchema = z.object({
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  roles: rolesField,
  phone: z.string().max(20).optional(),
  password: z.string().min(6, "Senha mínima: 6 caracteres"),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  roles: rolesField,
  phone: z.string().max(20).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  active: z.coerce.boolean(),
});

export async function getUsersForAdmin() {
  await requireRole(["admin"]);
  return listAdminUsers();
}

export async function createUser(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    roles: parseRolesFromForm(formData),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const message =
      errors.name?.[0] ??
      errors.email?.[0] ??
      errors.password?.[0] ??
      errors.roles?.[0] ??
      "Dados inválidos";
    return { success: false, message };
  }

  const { name, email, roles, phone, password } = parsed.data;

  try {
    const { createUserDb, countUsersByEmailDb } = await import(
      "@/lib/data/users-admin-db"
    );
    if ((await countUsersByEmailDb(email)) > 0) {
      return { success: false, message: "E-mail já cadastrado" };
    }
    const passwordHash = await hashPassword(password);
    const newUserId = await createUserDb({ name, email, roles, phone, passwordHash });

    const { recordAuditEvent } = await import("@/lib/audit/record-audit-event");
    const { AUDIT_ACTIONS } = await import("@/lib/audit/actions");
    const { getDb } = await import("@/db");
    await recordAuditEvent(getDb(), {
      action: AUDIT_ACTIONS.ADMIN_USER_CREATED,
      entityType: "user",
      entityId: newUserId,
      actorId: session.userId,
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Usuário criado" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao criar usuário",
    };
  }
}

export async function updateUser(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    roles: parseRolesFromForm(formData),
    phone: formData.get("phone") || undefined,
    password: formData.get("password") || undefined,
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const message =
      errors.name?.[0] ??
      errors.email?.[0] ??
      errors.roles?.[0] ??
      "Dados inválidos";
    return { success: false, message };
  }

  const { id, name, email, roles, phone, password, active } = parsed.data;

  if (id === session.userId && !active) {
    return { success: false, message: "Você não pode desativar sua própria conta" };
  }
  if (id === session.userId && !rolesEqual(roles, session.roles)) {
    return {
      success: false,
      message: "Você não pode alterar seus próprios papéis",
    };
  }

  try {
    const { updateUserDb, countUsersByEmailDb } = await import(
      "@/lib/data/users-admin-db"
    );
    if ((await countUsersByEmailDb(email, id)) > 0) {
      return { success: false, message: "E-mail já cadastrado" };
    }
    const patch: Parameters<typeof updateUserDb>[1] = {
      name,
      email,
      roles,
      phone: phone ?? null,
      active,
    };
    if (password && password.length >= 6) {
      patch.passwordHash = await hashPassword(password);
    }
    await updateUserDb(id, patch);

    const { recordAuditEvent } = await import("@/lib/audit/record-audit-event");
    const { AUDIT_ACTIONS } = await import("@/lib/audit/actions");
    const { getDb } = await import("@/db");
    await recordAuditEvent(getDb(), {
      action: AUDIT_ACTIONS.ADMIN_USER_UPDATED,
      entityType: "user",
      entityId: id,
      actorId: session.userId,
      payload: { fields: Object.keys(patch) },
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Usuário atualizado" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao atualizar usuário",
    };
  }
}

export async function deleteUser(userId: string): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const id = z.string().uuid().safeParse(userId);
  if (!id.success) {
    return { success: false, message: "Usuário inválido" };
  }

  if (id.data === session.userId) {
    return { success: false, message: "Você não pode excluir sua própria conta" };
  }

  try {
    const { deleteUserDb, countAdminUsersDb, listAdminUsersDb } = await import(
      "@/lib/data/users-admin-db"
    );
    const all = await listAdminUsersDb();
    const target = all.find((u) => u.id === id.data);
    if (!target) {
      return { success: false, message: "Usuário não encontrado" };
    }
    if (
      target.roles.includes("admin") &&
      (await countAdminUsersDb(id.data)) === 0
    ) {
      return {
        success: false,
        message: "Não é possível remover o último administrador do sistema",
      };
    }
    await deleteUserDb(id.data);

    const { recordAuditEvent } = await import("@/lib/audit/record-audit-event");
    const { AUDIT_ACTIONS } = await import("@/lib/audit/actions");
    const { getDb } = await import("@/db");
    await recordAuditEvent(getDb(), {
      action: AUDIT_ACTIONS.ADMIN_USER_DELETED,
      entityType: "user",
      entityId: id.data,
      actorId: session.userId,
    });

    revalidatePath("/admin/users");
    return { success: true, message: "Usuário excluído permanentemente" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao excluir usuário",
    };
  }
}
