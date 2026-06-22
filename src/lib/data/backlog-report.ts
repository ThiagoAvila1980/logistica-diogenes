import "server-only";

import { asc, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { statusHistory } from "@/db/schema";
import { useMockData } from "@/lib/data/config";
import { listKanbanOrders } from "@/lib/data/kanban";
import type { OsStatus, MeasurementPriority } from "@/db/schema";
import { KANBAN_PHASES } from "@/lib/kanban/column-groups";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { SlaStatus } from "@/components/reports/sla-badge";
import {
  countOrdersByKanbanPhase,
  getPrimaryKanbanPhase,
  getReportPhaseLabel,
} from "@/lib/reports/phase-counts";
import { getOrderDisplayNumber } from "@/lib/order-display";

export type BacklogRow = {
  id: string;
  displayNumber: string;
  clientName: string;
  etapa: OsStatus;
  etapaLabel: string;
  phaseId: string;
  phaseTitle: string;
  priority: MeasurementPriority;
  daysInCurrentStage: number;
  slaStatus: SlaStatus;
  enteredStageAt: Date | null;
};

export type BacklogSummary = {
  rows: BacklogRow[];
  /** Tempo médio (dias) em cada fase, por prioridade */
  avgDaysByPhase: {
    phaseId: string;
    phaseTitle: string;
    avgDays: { normal: number; alta: number; urgente: number };
  }[];
  /** Distribuição por fase */
  byPhase: { phaseId: string; phaseTitle: string; count: number }[];
};

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function slaForPriority(days: number, priority: MeasurementPriority): SlaStatus {
  const limits: Record<MeasurementPriority, [number, number]> = {
    urgente: [1, 3],
    alta: [3, 7],
    normal: [7, 14],
  };
  const [warn, crit] = limits[priority];
  if (days <= warn) return "ok";
  if (days <= crit) return "warning";
  return "critical";
}

async function getBacklogSummaryDb(): Promise<BacklogSummary> {
  const db = getDb();
  const allKanbanOrders = await listKanbanOrders();
  const openOrders = allKanbanOrders.filter((o) => o.status !== "concluido");

  if (openOrders.length === 0) {
    return {
      rows: [],
      avgDaysByPhase: KANBAN_PHASES.map((p) => ({
        phaseId: p.id,
        phaseTitle: getReportPhaseLabel(p.id, p.shortTitle),
        avgDays: { normal: 0, alta: 0, urgente: 0 },
      })),
      byPhase: countOrdersByKanbanPhase([]),
    };
  }

  const orderIds = openOrders.map((o) => o.id);
  const historyRows = await db
    .select({
      measurementId: statusHistory.measurementId,
      toStatus: statusHistory.toStatus,
      createdAt: statusHistory.createdAt,
    })
    .from(statusHistory)
    .where(inArray(statusHistory.measurementId, orderIds))
    .orderBy(asc(statusHistory.createdAt));

  const lastEnterMap = new Map<string, Date>();
  for (const h of historyRows) {
    const order = openOrders.find((o) => o.id === h.measurementId);
    if (!order) continue;
    if (h.toStatus === order.status) {
      lastEnterMap.set(h.measurementId, h.createdAt);
    }
  }

  const rows: BacklogRow[] = openOrders.map((order) => {
    const enteredAt = lastEnterMap.get(order.id) ?? order.updatedAt;
    const days = daysAgo(enteredAt);
    const phase = getPrimaryKanbanPhase(order);

    return {
      id: order.id,
      displayNumber: getOrderDisplayNumber(order),
      clientName: order.clientName,
      etapa: order.status,
      etapaLabel: STATUS_LABELS[order.status],
      phaseId: phase.id,
      phaseTitle: phase.title,
      priority: order.priority,
      daysInCurrentStage: days,
      slaStatus: slaForPriority(days, order.priority),
      enteredStageAt: enteredAt,
    };
  });

  rows.sort((a, b) => {
    const slaOrder: Record<SlaStatus, number> = { critical: 0, warning: 1, ok: 2 };
    const diff = slaOrder[a.slaStatus] - slaOrder[b.slaStatus];
    if (diff !== 0) return diff;
    return b.daysInCurrentStage - a.daysInCurrentStage;
  });

  const phaseAccum = new Map<
    string,
    { normal: number[]; alta: number[]; urgente: number[] }
  >();
  for (const p of KANBAN_PHASES) {
    phaseAccum.set(p.id, { normal: [], alta: [], urgente: [] });
  }
  for (const row of rows) {
    const acc = phaseAccum.get(row.phaseId);
    if (acc) acc[row.priority].push(row.daysInCurrentStage);
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

  const byPhase = countOrdersByKanbanPhase(openOrders);

  return {
    rows,
    avgDaysByPhase: KANBAN_PHASES.map((p) => {
      const acc = phaseAccum.get(p.id) ?? { normal: [], alta: [], urgente: [] };
      const phaseMeta = byPhase.find((b) => b.phaseId === p.id);
      return {
        phaseId: p.id,
        phaseTitle: phaseMeta?.phaseTitle ?? p.shortTitle,
        avgDays: {
          normal: avg(acc.normal),
          alta: avg(acc.alta),
          urgente: avg(acc.urgente),
        },
      };
    }),
    byPhase,
  };
}

function getMockBacklogSummary(): BacklogSummary {
  const now = new Date();
  const mockRows: BacklogRow[] = [
    {
      id: "1",
      displayNumber: "001/2026",
      clientName: "João Silva",
      etapa: "medicao_final",
      etapaLabel: "Final",
      phaseId: "medicao",
      phaseTitle: "Medição",
      priority: "urgente",
      daysInCurrentStage: 5,
      slaStatus: "critical",
      enteredStageAt: new Date(now.getTime() - 5 * 86_400_000),
    },
    {
      id: "2",
      displayNumber: "002/2026",
      clientName: "Maria Costa",
      etapa: "cortes",
      etapaLabel: "Cortes",
      phaseId: "plano_corte",
      phaseTitle: "Corte",
      priority: "alta",
      daysInCurrentStage: 4,
      slaStatus: "warning",
      enteredStageAt: new Date(now.getTime() - 4 * 86_400_000),
    },
    {
      id: "3",
      displayNumber: "003/2026",
      clientName: "Pedro Alves",
      etapa: "transporte_perfil",
      etapaLabel: "Perfil",
      phaseId: "transporte",
      phaseTitle: "Transp.",
      priority: "normal",
      daysInCurrentStage: 2,
      slaStatus: "ok",
      enteredStageAt: new Date(now.getTime() - 2 * 86_400_000),
    },
    {
      id: "4",
      displayNumber: "004/2026",
      clientName: "Ana Rodrigues",
      etapa: "instalacao_estrutural",
      etapaLabel: "Instalação estrutural",
      phaseId: "instalacao",
      phaseTitle: "Instalação",
      priority: "normal",
      daysInCurrentStage: 10,
      slaStatus: "critical",
      enteredStageAt: new Date(now.getTime() - 10 * 86_400_000),
    },
  ];

  return {
    rows: mockRows,
    avgDaysByPhase: KANBAN_PHASES.map((p, i) => ({
      phaseId: p.id,
      phaseTitle: p.shortTitle,
      avgDays: { normal: [5, 4, 2, 8, 0][i] ?? 0, alta: [3, 6, 3, 5, 0][i] ?? 0, urgente: [5, 4, 1, 4, 0][i] ?? 0 },
    })),
    byPhase: KANBAN_PHASES.map((p, i) => ({
      phaseId: p.id,
      phaseTitle: p.shortTitle,
      count: [2, 1, 1, 1, 0][i] ?? 0,
    })),
  };
}

export async function getBacklogSummary(): Promise<BacklogSummary> {
  if (useMockData()) return getMockBacklogSummary();
  return getBacklogSummaryDb();
}
