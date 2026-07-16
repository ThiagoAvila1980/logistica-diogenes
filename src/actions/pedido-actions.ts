"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { pedidos } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { recordAuditEvent } from "@/lib/audit/record-audit-event";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";
import { revalidateOSRoutes } from "@/lib/revalidate";
import { parseBrDate } from "@/lib/date-format";

export type SavePedidoResult =
  | { success: true }
  | { success: false; message: string };

const savePedidoSchema = z.object({
  osId: z.string().uuid(),
  pedidoFeito: z.enum(["on", "off", "true", "false", ""]).transform((v) => v === "on" || v === "true"),
  pedidoFeitoData: z.string().optional(),
  pedidoFeitoHora: z.string().optional(),
  pedidoRecebido: z.enum(["on", "off", "true", "false", ""]).transform((v) => v === "on" || v === "true"),
  pedidoRecebidoData: z.string().optional(),
  pedidoRecebidoHora: z.string().optional(),
});

function combineBrDateAndTime(
  dateStr: string | undefined,
  timeStr: string | undefined,
): Date | null {
  if (!dateStr || !timeStr) return null;
  const date = parseBrDate(dateStr);
  if (!date) return null;
  const parts = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!parts) return null;
  const [, hh, mm] = parts;
  date.setHours(Number(hh), Number(mm), 0, 0);
  return date;
}

export async function savePedidoAction(
  formData: FormData,
): Promise<SavePedidoResult> {
  const raw = {
    osId: formData.get("osId"),
    pedidoFeito: formData.get("pedidoFeito") ?? "off",
    pedidoFeitoData: formData.get("pedidoFeitoData") ?? undefined,
    pedidoFeitoHora: formData.get("pedidoFeitoHora") ?? undefined,
    pedidoRecebido: formData.get("pedidoRecebido") ?? "off",
    pedidoRecebidoData: formData.get("pedidoRecebidoData") ?? undefined,
    pedidoRecebidoHora: formData.get("pedidoRecebidoHora") ?? undefined,
  };

  const parsed = savePedidoSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos. Verifique os campos e tente novamente." };
  }

  let session;
  try {
    session = await requireRole(["admin", "gerente"]);
  } catch (err) {
    return { success: false, message: authErrorMessage(err) ?? "Sem permissão para esta ação." };
  }

  const {
    osId,
    pedidoFeito,
    pedidoFeitoData,
    pedidoFeitoHora,
    pedidoRecebido: rawPedidoRecebido,
    pedidoRecebidoData,
    pedidoRecebidoHora,
  } = parsed.data;

  // Dependência: recebido exige feito
  const pedidoRecebido = rawPedidoRecebido && pedidoFeito;

  // Validações de negócio: check marcado requer data + hora
  if (pedidoFeito) {
    const dt = combineBrDateAndTime(pedidoFeitoData, pedidoFeitoHora);
    if (!dt) {
      return { success: false, message: "Informe a data e horário do Pedido Feito." };
    }
  }

  if (pedidoRecebido) {
    const dt = combineBrDateAndTime(pedidoRecebidoData, pedidoRecebidoHora);
    if (!dt) {
      return { success: false, message: "Informe a data e horário do Pedido Recebido." };
    }
  }

  const pedidoFeitoAt = pedidoFeito
    ? combineBrDateAndTime(pedidoFeitoData, pedidoFeitoHora)
    : null;

  const pedidoRecebidoAt = pedidoRecebido
    ? combineBrDateAndTime(pedidoRecebidoData, pedidoRecebidoHora)
    : null;

  try {
    const db = getDb();

    await db.transaction(async (tx) => {
      await tx
        .insert(pedidos)
        .values({
          idMedicao: osId,
          pedidoFeito,
          pedidoFeitoAt,
          pedidoFeitoPorId: pedidoFeito ? session.userId : null,
          pedidoRecebido,
          pedidoRecebidoAt,
          pedidoRecebidoPorId: pedidoRecebido ? session.userId : null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pedidos.idMedicao,
          set: {
            pedidoFeito,
            pedidoFeitoAt,
            pedidoFeitoPorId: pedidoFeito ? session.userId : null,
            pedidoRecebido,
            pedidoRecebidoAt,
            pedidoRecebidoPorId: pedidoRecebido ? session.userId : null,
            updatedAt: new Date(),
          },
        });

      await recordAuditEvent(tx, {
        actorId: session.userId,
        action: AUDIT_ACTIONS.PEDIDO_UPDATED,
        measurementId: osId,
        payload: {
          pedidoFeito,
          pedidoFeitoAt: pedidoFeitoAt?.toISOString() ?? null,
          pedidoRecebido,
          pedidoRecebidoAt: pedidoRecebidoAt?.toISOString() ?? null,
        },
      });
    });

    revalidateOSRoutes(osId);
    revalidatePath(`/field/${osId}/pedidos`);
    return { success: true };
  } catch (err) {
    console.error("[savePedidoAction]", err);
    return { success: false, message: "Erro ao salvar pedido. Tente novamente." };
  }
}
