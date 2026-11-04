import { getOrderDisplayNumber } from "@/lib/order-display";
import { getVaoNumber } from "@/lib/measurement/vao-item-subtitle";
import type { MeasurementPriority } from "@/db/schema";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

export const AGENDA_TIME_ZONE = "America/Sao_Paulo";

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export type AgendaVaoWorkStatus = "a_fazer" | "em_andamento" | "concluido";

export const AGENDA_STATUS_LABELS: Record<AgendaVaoWorkStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export type AgendaMeasurementRow = {
  id: string;
  number: string;
  numeroOrcamento: string | null;
  budgetReference: string | null;
  cliente: string | null;
  endereco: string | null;
  telefone: string | null;
  priority: MeasurementPriority;
  items: MeasurementLineItem[] | null;
};

export type AgendaVaoItem = {
  osId: string;
  osNumber: string;
  displayNumber: string;
  clientName: string;
  clientAddress: string | null;
  clientPhone: string | null;
  priority: MeasurementPriority;
  itemId: string;
  vaoNumber: number;
  installerId: string | null;
  installerName: string | null;
  scheduledInstallationDate: string;
  estrutural: boolean;
  vidros: boolean;
  acabamento: boolean;
  concluido: boolean;
};

export type AgendaDayOrder = {
  osId: string;
  displayNumber: string;
  clientName: string;
  clientAddress: string | null;
  clientPhone: string | null;
  priority: MeasurementPriority;
  vaos: AgendaVaoItem[];
};

export type AgendaInstallerGroup = {
  installerId: string | null;
  installerName: string | null;
  orders: AgendaDayOrder[];
};

export function isAgendaIsoDate(value: string): boolean {
  const match = ISO_DATE_REGEX.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function resolveAgendaDate(
  param: string | undefined,
  todayIso: string,
): string {
  if (param && isAgendaIsoDate(param)) return param;
  return todayIso;
}

export function getSaoPauloIsoDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: AGENDA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function extractAgendaVaos(
  rows: AgendaMeasurementRow[],
  options: {
    isoDate: string;
    installerId?: string;
  },
): Omit<AgendaVaoItem, "installerName">[] {
  const vaos: Omit<AgendaVaoItem, "installerName">[] = [];

  for (const row of rows) {
    const items = row.items ?? [];
    items.forEach((item, index) => {
      const date = item.installationProgress?.scheduledInstallationDate ?? null;
      if (!date || date !== options.isoDate) return;

      const installerId = item.installationProgress?.installerId ?? null;
      if (options.installerId && installerId !== options.installerId) return;

      vaos.push({
        osId: row.id,
        osNumber: row.number,
        displayNumber: getOrderDisplayNumber({
          number: row.number,
          budgetReference: row.budgetReference,
          numeroOrcamento: row.numeroOrcamento,
        }),
        clientName: row.cliente?.trim() || "Cliente não informado",
        clientAddress: row.endereco,
        clientPhone: row.telefone,
        priority: row.priority,
        itemId: item.id,
        vaoNumber: getVaoNumber(item, index),
        installerId,
        scheduledInstallationDate: date,
        estrutural: item.installationProgress?.estrutural === true,
        vidros: item.installationProgress?.vidros === true,
        acabamento: item.installationProgress?.acabamento === true,
        concluido: item.installationProgress?.concluido === true,
      });
    });
  }

  return vaos;
}

export function attachInstallerNames(
  vaos: Omit<AgendaVaoItem, "installerName">[],
  names: Map<string, string>,
): AgendaVaoItem[] {
  return vaos.map((vao) => ({
    ...vao,
    installerName: vao.installerId ? (names.get(vao.installerId) ?? null) : null,
  }));
}

export function agendaVaoStatus(
  vao: Pick<
    AgendaVaoItem,
    "concluido" | "estrutural" | "vidros" | "acabamento"
  >,
): AgendaVaoWorkStatus {
  if (vao.concluido) return "concluido";
  if (vao.estrutural || vao.vidros || vao.acabamento) return "em_andamento";
  return "a_fazer";
}

function compareDisplayNumber(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

export function groupVaosByOrder(vaos: AgendaVaoItem[]): AgendaDayOrder[] {
  const byOs = new Map<string, AgendaDayOrder>();

  for (const vao of vaos) {
    const existing = byOs.get(vao.osId);
    if (existing) {
      existing.vaos.push(vao);
      continue;
    }
    byOs.set(vao.osId, {
      osId: vao.osId,
      displayNumber: vao.displayNumber,
      clientName: vao.clientName,
      clientAddress: vao.clientAddress,
      clientPhone: vao.clientPhone,
      priority: vao.priority,
      vaos: [vao],
    });
  }

  const orders = [...byOs.values()];
  for (const order of orders) {
    order.vaos.sort((a, b) => a.vaoNumber - b.vaoNumber);
  }
  orders.sort((a, b) => compareDisplayNumber(a.displayNumber, b.displayNumber));
  return orders;
}

export function groupVaosByInstaller(
  vaos: AgendaVaoItem[],
): AgendaInstallerGroup[] {
  const byInstaller = new Map<string, AgendaVaoItem[]>();

  for (const vao of vaos) {
    const key = vao.installerId ?? "";
    const list = byInstaller.get(key);
    if (list) list.push(vao);
    else byInstaller.set(key, [vao]);
  }

  const groups: AgendaInstallerGroup[] = [];
  for (const [key, groupVaos] of byInstaller) {
    groups.push({
      installerId: key || null,
      installerName: groupVaos[0]?.installerName ?? null,
      orders: groupVaosByOrder(groupVaos),
    });
  }

  groups.sort((a, b) => {
    if (a.installerId == null && b.installerId != null) return 1;
    if (a.installerId != null && b.installerId == null) return -1;
    return (a.installerName ?? "").localeCompare(b.installerName ?? "", "pt-BR", {
      sensitivity: "base",
    });
  });

  return groups;
}
