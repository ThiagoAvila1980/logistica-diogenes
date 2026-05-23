"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { cuttingPlans, serviceOrders, users } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/require-role";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { getServiceOrderById } from "@/lib/data/orders";
import { createCuttingProblemNotifications } from "@/lib/data/notifications-db";
import { getOrderDisplayNumber } from "@/lib/order-display";

const updateStepSchema = z.object({
  osId: z.string().uuid(),
  step: z.enum(["corte", "embalagem", "acessorios"]),
  done: z.boolean(),
});

export type UpdateCuttingStepResult =
  | { success: true }
  | { success: false; message: string };

const CUTTING_STATUSES = ["cortes", "embalagem", "acessorios_plano"] as const;

export async function updateCuttingStepAction(
  raw: z.infer<typeof updateStepSchema>,
): Promise<UpdateCuttingStepResult> {
  const parsed = updateStepSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Dados inválidos" };

  try {
    await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, step, done } = parsed.data;

  if (useMockData()) {
    const result = mockRepository.updateCuttingStep(osId, step, done);
    if (result.success) {
      revalidatePath(`/production/${osId}`);
      revalidatePath("/production");
      revalidatePath("/dashboard");
    }
    return result;
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };
    if (!CUTTING_STATUSES.includes(order.status as (typeof CUTTING_STATUSES)[number])) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: cuttingPlans.id })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.osId, osId))
      .limit(1);

    const fieldMap = {
      corte: { corteFeito: done },
      embalagem: { embalagemFeita: done },
      acessorios: { acessoriosFeitos: done },
    } as const;

    if (existing) {
      await db
        .update(cuttingPlans)
        .set(fieldMap[step])
        .where(eq(cuttingPlans.id, existing.id));
    } else {
      await db.insert(cuttingPlans).values({
        osId,
        status: "em_andamento",
        ...fieldMap[step],
      });
    }

    revalidatePath(`/production/${osId}`);
    revalidatePath("/production");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[updateCuttingStep]", err);
    return { success: false, message: "Erro ao atualizar etapa" };
  }
}

const alertSchema = z.object({
  osId: z.string().uuid(),
  message: z.string().min(5).max(1000),
});

export type SendCuttingAlertResult =
  | { success: true }
  | { success: false; message: string };

export async function sendCuttingAlertAction(
  raw: z.infer<typeof alertSchema>,
): Promise<SendCuttingAlertResult> {
  const parsed = alertSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Mensagem inválida" };

  try {
    await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId, message } = parsed.data;

  const session = await getSession();
  const order = await getServiceOrderById(osId);
  if (!order) return { success: false, message: "OS não encontrada" };

  try {
    const sent = await createCuttingProblemNotifications({
      osId,
      osNumber: getOrderDisplayNumber(order),
      clientName: order.clientName,
      senderName: session?.name ?? "Cortador",
      message,
    });
    if (sent === 0) {
      return {
        success: false,
        message: "Nenhum gestor ativo encontrado para notificar",
      };
    }
    return { success: true };
  } catch (err) {
    console.error("[sendCuttingAlert]", err);
    return { success: false, message: "Erro ao enviar notificação" };
  }
}
