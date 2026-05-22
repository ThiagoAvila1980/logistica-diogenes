import { eq, and, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { formatPhoneE164BR } from "./whatsapp";
import { formatBrDate } from "@/lib/date-format";
import { buildAppUrl } from "@/lib/navigation/masked-url";

export type MeasurementCreatedPayload = {
  event: "measurement_created";
  osId: string;
  osNumber: string;
  clientName: string;
  clientPhone: string | null;
  budgetReference: string | null;
  description: string | null;
  scheduledDate: string | null;
  fieldUrl: string;
  createdAt: string;
};

export type NotifyMeasurerResult = {
  webhook: { attempted: boolean; sent: boolean; error?: string };
  whatsapp: Array<{ name: string; sent: boolean; error?: string }>;
};

export function buildMeasurementFieldUrl(osId: string): string {
  return buildAppUrl(`/field/${osId}`);
}

async function postWebhook(payload: MeasurementCreatedPayload): Promise<{
  attempted: boolean;
  sent: boolean;
  error?: string;
}> {
  const url = process.env.MEDIDOR_WEBHOOK_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "development") {
      console.info("[medidor-webhook:mock]", JSON.stringify(payload, null, 2));
    }
    return { attempted: false, sent: false, error: "MEDIDOR_WEBHOOK_URL não configurada" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        attempted: true,
        sent: false,
        error: `Webhook ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    return { attempted: true, sent: true };
  } catch (err) {
    return {
      attempted: true,
      sent: false,
      error: err instanceof Error ? err.message : "Erro no webhook",
    };
  }
}

async function sendWhatsAppText(
  phone: string,
  message: string,
): Promise<{ sent: boolean; error?: string }> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    if (process.env.NODE_ENV === "development") {
      console.info("[medidor-whatsapp:mock]", formatPhoneE164BR(phone), message);
    }
    return { sent: false, error: "Z-API não configurada" };
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (clientToken) headers["Client-Token"] = clientToken;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ phone: formatPhoneE164BR(phone), message }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { sent: false, error: `Z-API ${res.status}: ${body.slice(0, 120)}` };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Erro WhatsApp",
    };
  }
}

function buildWhatsAppMessage(payload: MeasurementCreatedPayload): string {
  const lines = [
    "📐 *Nova medição disponível*",
    "",
    `Orçamento: *${payload.osNumber}*`,
    `Cliente: ${payload.clientName}`,
  ];
  if (payload.scheduledDate) {
    lines.push(`Data prevista: ${payload.scheduledDate}`);
  }
  lines.push("", `Abrir: ${payload.fieldUrl}`);
  return lines.join("\n");
}

/**
 * Notifica medidores quando admin cria uma medição em branco.
 * - POST para MEDIDOR_WEBHOOK_URL (se configurado)
 * - WhatsApp via Z-API para todos medidores ativos com telefone
 */
export async function notifyMedidorsOnMeasurementCreated(input: {
  osId: string;
  osNumber: string;
  clientName: string;
  clientPhone: string | null;
  budgetReference: string | null;
  description: string | null;
  scheduledDate: Date | null;
}): Promise<NotifyMeasurerResult> {
  const payload: MeasurementCreatedPayload = {
    event: "measurement_created",
    osId: input.osId,
    osNumber: input.osNumber,
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    budgetReference: input.budgetReference,
    description: input.description,
    scheduledDate: input.scheduledDate
      ? formatBrDate(input.scheduledDate)
      : null,
    fieldUrl: buildMeasurementFieldUrl(input.osId),
    createdAt: new Date().toISOString(),
  };

  const webhook = await postWebhook(payload);

  const whatsappResults: NotifyMeasurerResult["whatsapp"] = [];
  const message = buildWhatsAppMessage(payload);

  try {
    const db = getDb();
    const medidores = await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(
        and(
          sql`${users.roles} @> ARRAY['medidor']::user_roles[]`,
          eq(users.active, true),
        ),
      );

    for (const medidor of medidores) {
      if (!medidor.phone?.trim()) {
        whatsappResults.push({
          name: medidor.name,
          sent: false,
          error: "Sem telefone",
        });
        continue;
      }
      const result = await sendWhatsAppText(medidor.phone, message);
      whatsappResults.push({
        name: medidor.name,
        sent: result.sent,
        error: result.error,
      });
    }
  } catch (err) {
    console.error("[notifyMedidorsOnMeasurementCreated]", err);
  }

  return { webhook, whatsapp: whatsappResults };
}
