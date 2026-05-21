import { Resend } from "resend";
import type { ClientNotificationContext } from "./types";
import { buildClientEmail } from "./templates";
import type { NotificationChannelResult } from "./types";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendClientEmail(
  ctx: ClientNotificationContext,
): Promise<NotificationChannelResult> {
  if (!ctx.clientEmail) {
    return { channel: "email", sent: false, error: "Cliente sem e-mail" };
  }

  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!resend || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info("[resend:mock]", ctx.clientEmail, buildClientEmail(ctx).subject);
    }
    return {
      channel: "email",
      sent: false,
      error: "RESEND_API_KEY ou RESEND_FROM_EMAIL não configurados",
    };
  }

  try {
    const { subject, html } = buildClientEmail(ctx);
    const { error } = await resend.emails.send({
      from,
      to: ctx.clientEmail,
      subject,
      html,
    });

    if (error) {
      return { channel: "email", sent: false, error: error.message };
    }
    return { channel: "email", sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao enviar e-mail";
    return { channel: "email", sent: false, error: message };
  }
}
