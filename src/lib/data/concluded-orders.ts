import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements, users } from "@/db/schema";
import {
  hasMeasurementItems,
  measurementClientName,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { OsStatus } from "@/db/schema";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getVaoNumber } from "@/lib/measurement/vao-item-subtitle";
import { getSession } from "@/lib/auth/session";
import {
  canAccessConcludedPage,
  canViewAllConcludedOrders,
  hasRole,
} from "@/lib/auth/permissions";

export type VaoInstallationProgress = {
  id: string;
  index: number;
  label: string;
  installerId: string | null;
  installerName: string | null;
  estrutural: boolean;
  vidros: boolean;
  acabamento: boolean;
  concluido: boolean;
};

export type ConcludedOrderItem = {
  id: string;
  number: string;
  displayNumber: string;
  budgetReference: string | null;
  clientName: string;
  status: OsStatus;
  priority: "normal" | "alta" | "urgente";
  scheduledDate: Date | null;
  updatedAt: Date;
  assignedUserId: string | null;
  vaos: VaoInstallationProgress[];
  totalVaos: number;
  estruturalCount: number;
  vidrosCount: number;
  acabamentoCount: number;
};

const CONCLUDED_STATUSES: OsStatus[] = [
  "transporte_perfil",
  "transporte_estrutural",
  "transporte_perfis_total",
  "transporte_acessorios",
  "transporte_levar_vidro",
  "instalacao_estrutural",
  "instalacao_vidros",
  "concluido",
];

function hasVaoInstallationWork(vao: VaoInstallationProgress): boolean {
  return vao.concluido;
}

function summarizeVaos(vaos: VaoInstallationProgress[]) {
  return {
    vaos,
    totalVaos: vaos.length,
    estruturalCount: vaos.filter((v) => v.estrutural).length,
    vidrosCount: vaos.filter((v) => v.vidros).length,
    acabamentoCount: vaos.filter((v) => v.acabamento).length,
  };
}

/** Instalador vê apenas OS/vãos com installerId dele e conclusão registrada. */
export function filterConcludedOrdersForInstaller(
  orders: ConcludedOrderItem[],
  userId: string,
): ConcludedOrderItem[] {
  return orders
    .map((order) => {
      const workedVaos = order.vaos.filter(
        (vao) => vao.installerId === userId && hasVaoInstallationWork(vao),
      );
      if (workedVaos.length === 0) return null;
      return {
        ...order,
        ...summarizeVaos(workedVaos),
      };
    })
    .filter((order): order is ConcludedOrderItem => order !== null);
}

export async function listConcludedOrders(): Promise<ConcludedOrderItem[]> {
  const session = await getSession();
  if (!session || !canAccessConcludedPage(session.roles)) return [];

  const orders = await listConcludedOrdersDb();
  if (canViewAllConcludedOrders(session.roles)) return orders;
  if (!hasRole(session.roles, "instalador")) return [];

  return filterConcludedOrdersForInstaller(orders, session.userId);
}

async function resolveUserNamesByIds(
  ids: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const db = getDb();
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, uniqueIds));

  return new Map(rows.map((row) => [row.id, row.name]));
}

export async function listConcludedOrdersDb(): Promise<ConcludedOrderItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: measurements.id,
      number: measurements.number,
      budgetReference: resolvedBudgetReference,
      clientName: measurementClientName,
      status: measurements.etapa,
      priority: measurements.priority,
      scheduledDate: measurements.scheduledDate,
      updatedAt: measurements.updatedAt,
      assignedUserId: measurements.assignedUserId,
      items: measurements.items,
      hasMeasurement: hasMeasurementItems,
    })
    .from(measurements)
    .where(inArray(measurements.etapa, CONCLUDED_STATUSES))
    .orderBy(desc(measurements.updatedAt));

  const installerIds = rows.flatMap((r) => {
    const items = (r.items as MeasurementLineItem[] | null) ?? [];
    const perVaoIds = items
      .map((item) => item.installationProgress?.installerId)
      .filter((id): id is string => Boolean(id));
    if (perVaoIds.length > 0) return perVaoIds;
    return r.assignedUserId ? [r.assignedUserId] : [];
  });
  const installerNamesById = await resolveUserNamesByIds(installerIds);

  return rows
    .map((r) => {
      const items = (r.items as MeasurementLineItem[] | null) ?? [];

      const vaos: VaoInstallationProgress[] = items.map((item, idx) => {
        const installerId =
          item.installationProgress?.installerId ?? r.assignedUserId ?? null;
        return {
          id: item.id,
          index: idx,
          label: `Vão ${getVaoNumber(item, idx)}`,
          installerId,
          installerName: installerId
            ? (installerNamesById.get(installerId) ?? null)
            : null,
          estrutural: item.installationProgress?.estrutural ?? false,
          vidros: item.installationProgress?.vidros ?? false,
          acabamento: item.installationProgress?.acabamento ?? false,
          concluido: item.installationProgress?.concluido ?? false,
        };
      });

      const concludedVaos = vaos.filter((v) => v.concluido);
      const estruturalCount = concludedVaos.filter((v) => v.estrutural).length;
      const vidrosCount = concludedVaos.filter((v) => v.vidros).length;
      const acabamentoCount = concludedVaos.filter((v) => v.acabamento).length;

      const hasAnyProgress = concludedVaos.length > 0;
      if (!hasAnyProgress && r.status !== "concluido") return null;

      const item: ConcludedOrderItem = {
        id: r.id,
        number: r.number,
        displayNumber: getOrderDisplayNumber({ number: r.number, budgetReference: r.budgetReference }),
        budgetReference: r.budgetReference,
        clientName: r.clientName,
        status: r.status,
        priority: r.priority,
        scheduledDate: r.scheduledDate,
        updatedAt: r.updatedAt,
        assignedUserId: r.assignedUserId,
        vaos,
        totalVaos: vaos.length,
        estruturalCount,
        vidrosCount,
        acabamentoCount,
      };

      return item;
    })
    .filter((item): item is ConcludedOrderItem => item !== null);
}
