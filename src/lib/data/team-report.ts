import "server-only";

import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { workEvents, users } from "@/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScoringMemberStats = {
  userId: string;
  name: string;
  roles: string[];
  totalPoints: number;
  corteVaoPoints: number;
  transporteVaoPoints: number;
  instalacaoVaoPoints: number;
  medicaoPoints: number;
  corteVaoCount: number;
  transporteVaoCount: number;
  instalacaoVaoCount: number;
  medicaoCount: number;
};

export type TeamReportData = {
  members: ScoringMemberStats[];
  totalPoints: number;
  period: { from: string; to: string };
  generatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
}

export function parsePeriodParams(
  from: string | undefined,
  to: string | undefined,
): { from: Date; to: Date } {
  const now = new Date();

  let fromDate = startOfMonth(now);
  let toDate = endOfMonth(now);

  if (from) {
    const d = new Date(from);
    if (!isNaN(d.getTime())) fromDate = d;
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d.getTime())) toDate = d;
  }

  return { from: fromDate, to: toDate };
}

// ─── DB query ─────────────────────────────────────────────────────────────────

async function getTeamReportDb(from: Date, to: Date): Promise<TeamReportData> {
  const db = getDb();

  // 1. Todos os usuários ativos
  const allUsers = await db
    .select({ id: users.id, name: users.name, roles: users.roles })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(asc(users.name));

  // 2. Eventos do período agrupados por (userId, eventType)
  const eventRows = await db
    .select({
      userId: workEvents.userId,
      eventType: workEvents.eventType,
      totalPoints: sql<number>`SUM(${workEvents.points})::int`,
      eventCount: sql<number>`COUNT(*)::int`,
    })
    .from(workEvents)
    .where(
      and(
        gte(workEvents.createdAt, from),
        lte(workEvents.createdAt, to),
      ),
    )
    .groupBy(workEvents.userId, workEvents.eventType);

  // 3. Agrega em mapa por userId
  type EventAgg = {
    corteVaoPoints: number;
    transporteVaoPoints: number;
    instalacaoVaoPoints: number;
    medicaoPoints: number;
    corteVaoCount: number;
    transporteVaoCount: number;
    instalacaoVaoCount: number;
    medicaoCount: number;
  };

  const byUser = new Map<string, EventAgg>();

  for (const row of eventRows) {
    if (!byUser.has(row.userId)) {
      byUser.set(row.userId, {
        corteVaoPoints: 0,
        transporteVaoPoints: 0,
        instalacaoVaoPoints: 0,
        medicaoPoints: 0,
        corteVaoCount: 0,
        transporteVaoCount: 0,
        instalacaoVaoCount: 0,
        medicaoCount: 0,
      });
    }

    const agg = byUser.get(row.userId)!;
    const pts = Number(row.totalPoints);
    const cnt = Number(row.eventCount);

    if (row.eventType === "corte_vao") {
      agg.corteVaoPoints += pts;
      agg.corteVaoCount += cnt;
    } else if (row.eventType === "transporte_vao") {
      agg.transporteVaoPoints += pts;
      agg.transporteVaoCount += cnt;
    } else if (row.eventType === "instalacao_vao") {
      agg.instalacaoVaoPoints += pts;
      agg.instalacaoVaoCount += cnt;
    } else if (row.eventType === "medicao") {
      agg.medicaoPoints += pts;
      agg.medicaoCount += cnt;
    }
  }

  // 4. Monta array de membros — inclui todos os ativos, mesmo com 0 pontos
  const members: ScoringMemberStats[] = allUsers.map((u) => {
    const agg = byUser.get(u.id);
    const corteVaoPoints = agg?.corteVaoPoints ?? 0;
    const transporteVaoPoints = agg?.transporteVaoPoints ?? 0;
    const instalacaoVaoPoints = agg?.instalacaoVaoPoints ?? 0;
    const medicaoPoints = agg?.medicaoPoints ?? 0;

    return {
      userId: u.id,
      name: u.name,
      roles: u.roles as string[],
      totalPoints: corteVaoPoints + transporteVaoPoints + instalacaoVaoPoints + medicaoPoints,
      corteVaoPoints,
      transporteVaoPoints,
      instalacaoVaoPoints,
      medicaoPoints,
      corteVaoCount: agg?.corteVaoCount ?? 0,
      transporteVaoCount: agg?.transporteVaoCount ?? 0,
      instalacaoVaoCount: agg?.instalacaoVaoCount ?? 0,
      medicaoCount: agg?.medicaoCount ?? 0,
    };
  });

  // Ordena por total decrescente
  members.sort((a, b) => b.totalPoints - a.totalPoints);

  const totalPoints = members.reduce((s, m) => s + m.totalPoints, 0);

  return {
    members,
    totalPoints,
    period: { from: from.toISOString(), to: to.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getTeamReport(from: Date, to: Date): Promise<TeamReportData> {
  return getTeamReportDb(from, to);
}
