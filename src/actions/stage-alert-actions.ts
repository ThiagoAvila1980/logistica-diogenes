"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/require-role";
import { getServiceOrderById } from "@/lib/data/orders";
import {
  createStageProblemNotifications,
  resolveStageRecordIds,
} from "@/lib/data/notifications-db";
import { getOrderDisplayNumber } from "@/lib/order-display";
import {
  STAGE_ALERT_ALLOWED_ROLES,
  STAGE_ALERT_TYPES,
  type StageAlertType,
} from "@/lib/notifications/stage-alerts";

const alertSchema = z.object({
  osId: z.string().uuid(),
  stage: z.enum(STAGE_ALERT_TYPES),
  message: z.string().min(5).max(1000),
});

export type SendStageProblemAlertResult =
  | { success: true }
  | { success: false; message: string };

export async function sendStageProblemAlertAction(
  raw: z.infer<typeof alertSchema>,
): Promise<SendStageProblemAlertResult> {
  const parsed = alertSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Mensagem inválida" };

  const { osId, stage, message } = parsed.data;

  try {
    await requireRole(STAGE_ALERT_ALLOWED_ROLES[stage] as never);
  } catch {
    return { success: false, message: "Sem permissão para esta ação" };
  }

  const session = await getSession();
  const order = await getServiceOrderById(osId);
  if (!order) return { success: false, message: "Medição não encontrada" };

  try {
    const recordIds = await resolveStageRecordIds(osId, stage);
    const sent = await createStageProblemNotifications({
      stage,
      measurementId: osId,
      osNumber: getOrderDisplayNumber(order),
      clientName: order.clientName,
      senderName: session?.name ?? defaultSenderForStage(stage),
      message,
      ...recordIds,
    });

    if (sent === 0) {
      return {
        success: false,
        message: "Nenhum gestor ativo encontrado para notificar",
      };
    }

    revalidatePathsForStage(osId, stage);
    return { success: true };
  } catch (err) {
    console.error("[sendStageProblemAlert]", err);
    return { success: false, message: "Erro ao enviar notificação" };
  }
}

function defaultSenderForStage(stage: StageAlertType): string {
  switch (stage) {
    case "measurement":
      return "Medidor";
    case "cutting":
      return "Cortador";
    case "transport":
      return "Motorista";
    case "installation":
      return "Instalador";
  }
}

function revalidatePathsForStage(measurementId: string, stage: StageAlertType) {
  revalidatePath("/dashboard");
  switch (stage) {
    case "measurement":
      revalidatePath("/field");
      revalidatePath(`/field/${measurementId}`);
      break;
    case "cutting":
      revalidatePath("/production");
      revalidatePath(`/production/${measurementId}`);
      break;
    case "transport":
      revalidatePath("/logistics");
      revalidatePath(`/logistics/${measurementId}`);
      break;
    case "installation":
      revalidatePath("/installation");
      revalidatePath(`/installation/${measurementId}`);
      break;
  }
}
