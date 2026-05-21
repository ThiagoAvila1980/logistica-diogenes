import { buildClientWhatsAppMessage } from "./templates";
import type { ClientNotificationContext, NotificationChannelResult } from "./types";

/** Formata telefone BR para Z-API (somente dígitos, com DDI 55) */
export function formatPhoneE164BR(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
  return digits;
}

/**
 * Z-API — https://developer.z-api.io/
 * Env: ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN (opcional)
 */
export async function sendClientWhatsApp(
  ctx: ClientNotificationContext,
): Promise<NotificationChannelResult> {
  if (!ctx.clientPhone) {
    return { channel: "whatsapp", sent: false, error: "Cliente sem telefone" };
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[whatsapp:mock]",
        formatPhoneE164BR(ctx.clientPhone),
        buildClientWhatsAppMessage(ctx),
      );
    }
    return {
      channel: "whatsapp",
      sent: false,
      error: "ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados",
    };
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const phone = formatPhoneE164BR(ctx.clientPhone);
  const message = buildClientWhatsAppMessage(ctx);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (clientToken) headers["Client-Token"] = clientToken;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone, message }),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        channel: "whatsapp",
        sent: false,
        error: `Z-API ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    return { channel: "whatsapp", sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro WhatsApp";
    return { channel: "whatsapp", sent: false, error: msg };
  }
}
