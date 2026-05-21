import type { OsStatus } from "@/db/schema";

export type ClientNotificationContext = {
  osId: string;
  osNumber: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  newStatus: OsStatus;
};

export type NotificationChannelResult = {
  channel: "email" | "whatsapp";
  sent: boolean;
  error?: string;
};

export type NotifyClientResult = {
  attempted: boolean;
  results: NotificationChannelResult[];
};

/** Status que disparam e-mail + WhatsApp ao cliente */
export const CLIENT_NOTIFY_STATUSES: OsStatus[] = ["transporte_levar_vidro"];

/** Kanban: transporte iniciado = só WhatsApp */
export const KANBAN_NOTIFY_STATUSES: OsStatus[] = [
  "transporte_perfil",
  "transporte_levar_vidro",
];

export function isKanbanNotifyStatus(
  status: OsStatus,
): status is "transporte_perfil" | "transporte_levar_vidro" {
  return status === "transporte_perfil" || status === "transporte_levar_vidro";
}
