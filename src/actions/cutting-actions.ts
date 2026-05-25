"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { cuttingPlans } from "@/db/schema";
import { requireRole } from "@/lib/auth/require-role";
import { useMockData } from "@/lib/data/config";
import { mockRepository } from "@/lib/data/mock-repository";
import { getServiceOrderById } from "@/lib/data/orders";
import { sendStageProblemAlertAction } from "@/actions/stage-alert-actions";

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
    if (
      !CUTTING_STATUSES.includes(
        order.status as (typeof CUTTING_STATUSES)[number],
      )
    ) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: cuttingPlans.id })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
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
        idMedicao: osId,
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

  return sendStageProblemAlertAction({
    osId: parsed.data.osId,
    stage: "cutting",
    message: parsed.data.message,
  });
}
