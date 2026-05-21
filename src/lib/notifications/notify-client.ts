import {
  CLIENT_NOTIFY_STATUSES,
  isKanbanNotifyStatus,
  type ClientNotificationContext,
  type NotifyClientResult,
} from "./types";
import { sendClientEmail } from "./resend";
import { sendClientWhatsApp } from "./whatsapp";

export async function notifyClientOnStatusChange(
  ctx: ClientNotificationContext,
): Promise<NotifyClientResult> {
  if (!CLIENT_NOTIFY_STATUSES.includes(ctx.newStatus)) {
    return { attempted: false, results: [] };
  }

  const [emailResult, whatsappResult] = await Promise.all([
    sendClientEmail(ctx),
    sendClientWhatsApp(ctx),
  ]);

  return {
    attempted: true,
    results: [emailResult, whatsappResult],
  };
}

/** Notificação ao mover card no Kanban */
export async function notifyKanbanStatusChange(
  ctx: ClientNotificationContext,
): Promise<NotifyClientResult> {
  if (!isKanbanNotifyStatus(ctx.newStatus)) {
    return { attempted: false, results: [] };
  }

  if (ctx.newStatus === "transporte_perfil") {
    const whatsappResult = await sendClientWhatsApp(ctx);
    return {
      attempted: true,
      results: [whatsappResult],
    };
  }

  if (ctx.newStatus === "transporte_levar_vidro") {
    return notifyClientOnStatusChange(ctx);
  }

  return { attempted: false, results: [] };
}

export function formatNotificationSummary(result: NotifyClientResult): string {
  if (!result.attempted) return "";
  const sent = result.results.filter((r) => r.sent);
  if (sent.length === 0) {
    const errors = result.results.map((r) => r.error).filter(Boolean);
    return errors.length
      ? `Notificações não enviadas: ${errors.join("; ")}`
      : "";
  }
  const channels = sent.map((r) => (r.channel === "email" ? "e-mail" : "WhatsApp"));
  return `Cliente notificado via ${channels.join(" e ")}.`;
}
