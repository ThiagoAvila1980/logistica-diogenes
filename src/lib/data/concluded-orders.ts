import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { measurements } from "@/db/schema";
import {
  hasMeasurementItems,
  measurementClientName,
  resolvedBudgetReference,
} from "@/lib/data/order-measurement-join";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { OsStatus } from "@/db/schema";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getSession } from "@/lib/auth/session";
import { canViewAllOrders } from "@/lib/auth/permissions";
import {
  isInstallerResponsibleForOrder,
} from "@/lib/installation/installation-installer-access";

export type VaoInstallationProgress = {
  id: string;
  index: number;
  label: string;
  installerId: string | null;
  estrutural: boolean;
  vidros: boolean;
  acabamento: boolean;
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

export async function listConcludedOrders(): Promise<ConcludedOrderItem[]> {
  const session = await getSession();
  const orders = await listConcludedOrdersDb();
  if (!session || canViewAllOrders(session.roles)) return orders;

  return orders
    .filter((order) => {
      const installerIds = order.vaos
        .map((vao) => vao.installerId)
        .filter((id): id is string => !!id);
      return isInstallerResponsibleForOrder(
        session.userId,
        installerIds,
        order.assignedUserId,
      );
    })
    .map((order) => {
      const installerIds = order.vaos
        .map((vao) => vao.installerId)
        .filter((id): id is string => !!id);
      const hasPerVaoAssignment = installerIds.length > 0;
      if (!hasPerVaoAssignment) return order;

      const assignedVaos = order.vaos.filter(
        (vao) => vao.installerId === session.userId,
      );
      if (assignedVaos.length === 0) return null;

      const estruturalCount = assignedVaos.filter((v) => v.estrutural).length;
      const vidrosCount = assignedVaos.filter((v) => v.vidros).length;
      const acabamentoCount = assignedVaos.filter((v) => v.acabamento).length;

      return {
        ...order,
        vaos: assignedVaos,
        totalVaos: assignedVaos.length,
        estruturalCount,
        vidrosCount,
        acabamentoCount,
      };
    })
    .filter((order): order is ConcludedOrderItem => order !== null);
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

  return rows
    .map((r) => {
      const items = (r.items as MeasurementLineItem[] | null) ?? [];

      const vaos: VaoInstallationProgress[] = items.map((item, idx) => ({
        id: item.id,
        index: idx,
        label: `Vão ${idx + 1}`,
        installerId: item.installationProgress?.installerId ?? null,
        estrutural: item.installationProgress?.estrutural ?? false,
        vidros: item.installationProgress?.vidros ?? false,
        acabamento: item.installationProgress?.acabamento ?? false,
      }));

      const estruturalCount = vaos.filter((v) => v.estrutural).length;
      const vidrosCount = vaos.filter((v) => v.vidros).length;
      const acabamentoCount = vaos.filter((v) => v.acabamento).length;

      // Só mostra OSs que têm pelo menos um vão com algum progresso de instalação
      const hasAnyProgress = estruturalCount > 0 || vidrosCount > 0 || acabamentoCount > 0;
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
