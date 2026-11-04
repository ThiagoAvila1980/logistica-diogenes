"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { parseServicoForm } from "@/lib/servicos/form";
import {
  deleteServicoDb,
  descricaoServicoEmUsoDb,
  listServicosDb,
  upsertServicoDb,
} from "@/lib/data/servicos-db";

export type AdminActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

const idSchema = z.string().uuid();

export async function getServicosForAdmin() {
  await requireRole(["admin"]);
  return listServicosDb();
}

export async function saveServico(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  const parsed = parseServicoForm({
    id: formData.get("id") || undefined,
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    tempo: formData.get("tempo"),
    meta: formData.get("meta"),
    bonus: formData.get("bonus"),
    escopo: formData.get("escopo"),
  });

  if (!parsed.ok) return { success: false, message: parsed.message };

  if (parsed.data.id && !idSchema.safeParse(parsed.data.id).success) {
    return { success: false, message: "Serviço inválido" };
  }

  try {
    const duplicado = await descricaoServicoEmUsoDb(
      parsed.data.descricao,
      parsed.data.id,
    );
    if (duplicado) {
      return { success: false, message: "Já existe um serviço com essa descrição" };
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      const savedId = await upsertServicoDb(parsed.data, tx);
      await recordAuditEvent(tx, {
        action: parsed.data.id
          ? AUDIT_ACTIONS.ADMIN_SERVICO_UPDATED
          : AUDIT_ACTIONS.ADMIN_SERVICO_CREATED,
        entityType: "servico",
        entityId: savedId,
        actorId: session.userId,
        payload: { escopo: parsed.data.escopo },
      });
    });

    revalidatePath("/admin/servicos");
    return {
      success: true,
      message: parsed.data.id ? "Serviço atualizado" : "Serviço cadastrado",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao salvar serviço",
    };
  }
}

export async function deleteServico(servicoId: string): Promise<AdminActionResult> {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão" };
  }

  if (!idSchema.safeParse(servicoId).success) {
    return { success: false, message: "Serviço inválido" };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await deleteServicoDb(servicoId, tx);
      await recordAuditEvent(tx, {
        action: AUDIT_ACTIONS.ADMIN_SERVICO_DELETED,
        entityType: "servico",
        entityId: servicoId,
        actorId: session.userId,
      });
    });

    revalidatePath("/admin/servicos");
    return { success: true, message: "Serviço removido" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro ao remover serviço",
    };
  }
}
