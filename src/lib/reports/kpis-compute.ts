import type { KanbanOrderItem } from "@/lib/data/kanban";
import { KANBAN_PHASES, getPhaseIdForStatus } from "@/lib/kanban/column-groups";
import {
  countOrdersByKanbanPhase,
  getReportPhaseLabel,
} from "@/lib/reports/phase-counts";
import {
  filterKanbanOrdersForReport,
  kanbanOrderFilterFields,
  matchesDateRange,
  matchesOrderFilters,
  type StageOrderReportFilters,
} from "@/lib/reports/report-filters";
export type KpiStatusHistoryEntry = {
  measurementId: string;
  fromStatus: import("@/db/schema").OsStatus;
  toStatus: import("@/db/schema").OsStatus;
  createdAt: Date;
};

export type KpiOrderMeta = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export type KpiReportPayload = {
  orders: KanbanOrderItem[];
  orderMeta: KpiOrderMeta[];
  history: KpiStatusHistoryEntry[];
};

function monthKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${m}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function last6MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function filterOrdersForKpiReport(
  payload: KpiReportPayload,
  filters: StageOrderReportFilters,
): KanbanOrderItem[] {
  const metaById = new Map(payload.orderMeta.map((m) => [m.id, m]));

  return payload.orders.filter((order) => {
    const meta = metaById.get(order.id);
    if (!matchesOrderFilters(kanbanOrderFilterFields(order), filters)) {
      return false;
    }
    if (
      !matchesDateRange(
        meta?.createdAt ?? order.updatedAt,
        filters.dateFrom,
        filters.dateTo,
      )
    ) {
      return false;
    }
    return filterKanbanOrdersForReport([order], filters).length > 0;
  });
}

export type KpiSummary = {
  totalOrders: number;
  concludedOrders: number;
  inProgressOrders: number;
  urgentOpenOrders: number;
  createdLast30Days: number;
  concludedLast30Days: number;
  byPhase: { phaseId: string; phaseTitle: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  createdByMonth: { month: string; count: number }[];
  concludedByMonth: { month: string; count: number }[];
  avgTimeByPhase: { phaseId: string; phaseTitle: string; avgHours: number }[];
};

export function computeKpiSummary(
  payload: KpiReportPayload,
  filters: StageOrderReportFilters = {
    search: "",
    priority: "all",
    stage: "all",
    dateFrom: "",
    dateTo: "",
  },
): KpiSummary {
  const filteredOrders = filterOrdersForKpiReport(payload, filters);
  const filteredIds = new Set(filteredOrders.map((o) => o.id));
  const metaById = new Map(payload.orderMeta.map((m) => [m.id, m]));

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthKeys = last6MonthKeys();
  const createdMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));
  const concludedMap = new Map<string, number>(monthKeys.map((k) => [k, 0]));

  let concludedOrders = 0;
  let inProgressOrders = 0;
  let urgentOpenOrders = 0;
  let createdLast30 = 0;
  let concludedLast30 = 0;

  const priorityCount = new Map<string, number>([
    ["normal", 0],
    ["alta", 0],
    ["urgente", 0],
  ]);

  for (const order of filteredOrders) {
    const meta = metaById.get(order.id);
    const isConcluded = order.status === "concluido";
    const createdAt = meta?.createdAt ?? order.updatedAt;
    const updatedAt = meta?.updatedAt ?? order.updatedAt;

    if (isConcluded) {
      concludedOrders++;
      if (updatedAt >= thirtyDaysAgo) concludedLast30++;
      const mk = monthKey(updatedAt);
      if (concludedMap.has(mk)) concludedMap.set(mk, (concludedMap.get(mk) ?? 0) + 1);
    } else {
      inProgressOrders++;
      if (order.priority === "urgente") urgentOpenOrders++;
      priorityCount.set(order.priority, (priorityCount.get(order.priority) ?? 0) + 1);
    }

    if (createdAt >= thirtyDaysAgo) createdLast30++;
    const mk = monthKey(createdAt);
    if (createdMap.has(mk)) createdMap.set(mk, (createdMap.get(mk) ?? 0) + 1);
  }

  const filteredHistory = payload.history.filter((h) =>
    filteredIds.has(h.measurementId),
  );

  const phaseEnterMap = new Map<string, { measurementId: string; enteredAt: Date }[]>();
  const phaseExitMap = new Map<string, { measurementId: string; exitedAt: Date }[]>();
  for (const p of KANBAN_PHASES) {
    phaseEnterMap.set(p.id, []);
    phaseExitMap.set(p.id, []);
  }

  for (const h of filteredHistory) {
    const enterPhaseId = getPhaseIdForStatus(h.toStatus);
    if (enterPhaseId) {
      phaseEnterMap.get(enterPhaseId)?.push({
        measurementId: h.measurementId,
        enteredAt: h.createdAt,
      });
    }
    const exitPhaseId = getPhaseIdForStatus(h.fromStatus);
    if (exitPhaseId) {
      phaseExitMap.get(exitPhaseId)?.push({
        measurementId: h.measurementId,
        exitedAt: h.createdAt,
      });
    }
  }

  const avgTimeByPhase = KANBAN_PHASES.map((phase) => {
    const enters = phaseEnterMap.get(phase.id) ?? [];
    const exits = phaseExitMap.get(phase.id) ?? [];
    const exitByMeasurement = new Map<string, Date[]>();
    for (const e of exits) {
      const list = exitByMeasurement.get(e.measurementId) ?? [];
      list.push(e.exitedAt);
      exitByMeasurement.set(e.measurementId, list);
    }

    let totalMs = 0;
    let countPairs = 0;
    for (const enter of enters) {
      const exitList = exitByMeasurement.get(enter.measurementId) ?? [];
      const validExit = exitList.find((e) => e > enter.enteredAt);
      if (validExit) {
        totalMs += validExit.getTime() - enter.enteredAt.getTime();
        countPairs++;
      }
    }

    return {
      phaseId: phase.id,
      phaseTitle: getReportPhaseLabel(phase.id, phase.shortTitle),
      avgHours: countPairs > 0 ? Math.round(totalMs / countPairs / 3_600_000) : 0,
    };
  });

  return {
    totalOrders: filteredOrders.length,
    concludedOrders,
    inProgressOrders,
    urgentOpenOrders,
    createdLast30Days: createdLast30,
    concludedLast30Days: concludedLast30,
    byPhase: countOrdersByKanbanPhase(filteredOrders),
    byPriority: ["normal", "alta", "urgente"].map((priority) => ({
      priority,
      count: priorityCount.get(priority) ?? 0,
    })),
    createdByMonth: monthKeys.map((k) => ({
      month: monthLabel(k),
      count: createdMap.get(k) ?? 0,
    })),
    concludedByMonth: monthKeys.map((k) => ({
      month: monthLabel(k),
      count: concludedMap.get(k) ?? 0,
    })),
    avgTimeByPhase,
  };
}

export function reviveKpiReportPayload(payload: KpiReportPayload): KpiReportPayload {
  return {
    orders: payload.orders.map((order) => ({
      ...order,
      scheduledDate: order.scheduledDate ? new Date(order.scheduledDate) : null,
      updatedAt: new Date(order.updatedAt),
    })),
    orderMeta: payload.orderMeta.map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    })),
    history: payload.history.map((h) => ({
      ...h,
      createdAt: new Date(h.createdAt),
    })),
  };
}
