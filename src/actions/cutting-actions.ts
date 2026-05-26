"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { cuttingPlans, measurements, statusHistory } from "@/db/schema";
import type { OsStatus } from "@/db/schema";
import { isCuttingPhaseStatus, canOperateCuttingModule } from "@/lib/transport-gates";
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

function getCuttingStepsFromPlan(
  plan:
    | {
        corteFeito: boolean;
        embalagemFeita: boolean;
        acessoriosFeitos: boolean;
      }
    | undefined,
) {
  return {
    corteFeito: plan?.corteFeito ?? false,
    embalagemFeita: plan?.embalagemFeita ?? false,
    acessoriosFeitos: plan?.acessoriosFeitos ?? false,
  };
}

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
      revalidatePath(`/logistics/${osId}`);
      revalidatePath("/logistics");
      revalidatePath(`/installation/${osId}`);
      revalidatePath("/installation");
      revalidatePath("/dashboard");
    }
    return result;
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };

    const db = getDb();
    const [existingPlan] = await db
      .select({
        id: cuttingPlans.id,
        corteFeito: cuttingPlans.corteFeito,
        embalagemFeita: cuttingPlans.embalagemFeita,
        acessoriosFeitos: cuttingPlans.acessoriosFeitos,
      })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1);

    if (
      !canOperateCuttingModule(
        order.status as OsStatus,
        getCuttingStepsFromPlan(existingPlan),
      )
    ) {
      return { success: false, message: "OS não está em etapa de corte" };
    }

    const existing = existingPlan;

    const fieldMap = {
      corte: { corteFeito: done },
      embalagem: { embalagemFeita: done },
      acessorios: { acessoriosFeitos: done },
    } as const;

    let updatedPlan: typeof cuttingPlans.$inferSelect | undefined;

    if (existing) {
      const [updated] = await db
        .update(cuttingPlans)
        .set(fieldMap[step])
        .where(eq(cuttingPlans.id, existing.id))
        .returning();
      updatedPlan = updated;
    } else {
      const values = { idMedicao: osId, ...fieldMap[step] };
      const [inserted] = await db
        .insert(cuttingPlans)
        .values(values)
        .returning();
      updatedPlan = inserted;
    }

    // Quando o corte é concluído, libera transporte para o motorista em paralelo
    if (
      step === "corte" &&
      done &&
      updatedPlan?.corteFeito &&
      isCuttingPhaseStatus(order.status as OsStatus)
    ) {
      await db.transaction(async (tx) => {
        await tx
          .update(measurements)
          .set({ etapa: "transporte_perfil", updatedAt: new Date() })
          .where(eq(measurements.id, osId));
        await tx.insert(statusHistory).values({
          measurementId: osId,
          fromStatus: order.status,
          toStatus: "transporte_perfil",
          metadata: { source: "cutting_unlock_transport" },
        });
      });
    }

    revalidatePath(`/production/${osId}`);
    revalidatePath("/production");
    revalidatePath(`/logistics/${osId}`);
    revalidatePath("/logistics");
    revalidatePath(`/installation/${osId}`);
    revalidatePath("/installation");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[updateCuttingStep]", err);
    return { success: false, message: "Erro ao atualizar etapa" };
  }
}

const advanceToTransportSchema = z.object({
  osId: z.string().uuid(),
});

export type AdvanceToTransportResult =
  | { success: true }
  | { success: false; message: string };

export async function advanceCuttingToTransportAction(
  raw: z.infer<typeof advanceToTransportSchema>,
): Promise<AdvanceToTransportResult> {
  const parsed = advanceToTransportSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Dados inválidos" };

  try {
    await requireRole(["admin", "gerente", "cortador"]);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const { osId } = parsed.data;

  if (useMockData()) {
    return { success: true };
  }

  try {
    const order = await getServiceOrderById(osId);
    if (!order) return { success: false, message: "OS não encontrada" };
    if (order.status !== "acessorios_plano") {
      return { success: false, message: "Conclua todas as etapas de corte antes de avançar" };
    }

    const db = getDb();
    const [cutting] = await db
      .select({
        corteFeito: cuttingPlans.corteFeito,
        embalagemFeita: cuttingPlans.embalagemFeita,
        acessoriosFeitos: cuttingPlans.acessoriosFeitos,
      })
      .from(cuttingPlans)
      .where(eq(cuttingPlans.idMedicao, osId))
      .limit(1);

    if (!cutting || !cutting.corteFeito || !cutting.embalagemFeita || !cutting.acessoriosFeitos) {
      return { success: false, message: "Conclua todos os checkboxes de corte antes de avançar" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(measurements)
        .set({ etapa: "transporte_perfil", updatedAt: new Date() })
        .where(eq(measurements.id, osId));
      await tx.insert(statusHistory).values({
        measurementId: osId,
        fromStatus: "acessorios_plano",
        toStatus: "transporte_perfil",
        metadata: { source: "cutting_advance_to_transport" },
      });
    });

    revalidatePath(`/production/${osId}`);
    revalidatePath("/production");
    revalidatePath("/dashboard");
    revalidatePath(`/logistics/${osId}`);
    revalidatePath("/logistics");
    return { success: true };
  } catch (err) {
    console.error("[advanceCuttingToTransport]", err);
    return { success: false, message: "Erro ao avançar para transporte" };
  }
}
