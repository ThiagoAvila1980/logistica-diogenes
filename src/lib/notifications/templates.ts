import type { ClientNotificationContext } from "./types";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";

export function buildClientEmail(
  ctx: ClientNotificationContext,
): { subject: string; html: string } {
  const statusLabel = STATUS_LABELS[ctx.newStatus] ?? ctx.newStatus;

  if (ctx.newStatus === "aprovado_cliente") {
    return {
      subject: `Orçamento aprovado — ${ctx.osNumber}`,
      html: `
        <p>Olá, <strong>${ctx.clientName}</strong>,</p>
        <p>Seu orçamento <strong>${ctx.osNumber}</strong> foi <strong>aprovado</strong>.</p>
        <p>Em breve iniciaremos a produção. Qualquer dúvida, responda este e-mail.</p>
        <p style="color:#666;font-size:12px">Fluxo Diógenes — Vidraçaria</p>
      `,
    };
  }

  if (ctx.newStatus === "transporte_levar_vidro") {
    return {
      subject: `Material entregue — ${ctx.osNumber}`,
      html: `
        <p>Olá, <strong>${ctx.clientName}</strong>,</p>
        <p>Os materiais do orçamento <strong>${ctx.osNumber}</strong> foram <strong>entregues</strong> no local.</p>
        <p>Próxima etapa: agendamento da instalação (${statusLabel}).</p>
        <p style="color:#666;font-size:12px">Fluxo Diógenes — Vidraçaria</p>
      `,
    };
  }

  return {
    subject: `Atualização — ${ctx.osNumber}`,
    html: `<p>Seu orçamento ${ctx.osNumber} está em: ${statusLabel}</p>`,
  };
}

export function buildClientWhatsAppMessage(ctx: ClientNotificationContext): string {
  if (ctx.newStatus === "aprovado_cliente") {
    return `Olá ${ctx.clientName}! ✅ Orçamento ${ctx.osNumber} foi APROVADO. Em breve iniciamos a produção. — Fluxo Diógenes`;
  }
  if (ctx.newStatus === "transporte_perfil") {
    return `Olá ${ctx.clientName}! 🚚 Orçamento ${ctx.osNumber} está EM TRANSPORTE. Avisaremos quando os materiais chegarem ao local. — Fluxo Diógenes`;
  }
  if (ctx.newStatus === "transporte_levar_vidro") {
    return `Olá ${ctx.clientName}! 🚚 Materiais do orçamento ${ctx.osNumber} foram ENTREGUES no local. Em seguida agendamos a instalação. — Fluxo Diógenes`;
  }
  return `Atualização orçamento ${ctx.osNumber}: ${STATUS_LABELS[ctx.newStatus] ?? ctx.newStatus}`;
}
