import type { ClientNotificationContext } from "./types";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";

export function buildClientEmail(
  ctx: ClientNotificationContext,
): { subject: string; html: string } {
  const statusLabel = STATUS_LABELS[ctx.newStatus] ?? ctx.newStatus;

  if (ctx.newStatus === "transporte_levar_vidro") {
    return {
      subject: `Material entregue — ${ctx.osNumber}`,
      html: `
        <p>Olá, <strong>${ctx.clientName}</strong>,</p>
        <p>Os materiais do orçamento <strong>${ctx.osNumber}</strong> foram <strong>entregues</strong> no local.</p>
        <p>Próxima etapa: agendamento da instalação (${statusLabel}).</p>
        <p style="color:#666;font-size:12px">Logística Diógenes — Vidraçaria</p>
      `,
    };
  }

  return {
    subject: `Atualização — ${ctx.osNumber}`,
    html: `<p>Seu orçamento ${ctx.osNumber} está em: ${statusLabel}</p>`,
  };
}

export function buildClientWhatsAppMessage(ctx: ClientNotificationContext): string {
  if (ctx.newStatus === "transporte_perfil") {
    return `Olá ${ctx.clientName}! 🚚 Orçamento ${ctx.osNumber} está EM TRANSPORTE. Avisaremos quando os materiais chegarem ao local. — Logística Diógenes`;
  }
  if (ctx.newStatus === "transporte_levar_vidro") {
    return `Olá ${ctx.clientName}! 🚚 Materiais do orçamento ${ctx.osNumber} foram ENTREGUES no local. Em seguida agendamos a instalação. — Logística Diógenes`;
  }
  return `Atualização orçamento ${ctx.osNumber}: ${STATUS_LABELS[ctx.newStatus] ?? ctx.newStatus}`;
}
