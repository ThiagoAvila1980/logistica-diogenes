"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scissors,
  Truck,
  Wrench,
  Ruler,
  Trophy,
  Star,
} from "lucide-react";
import { KpiCard } from "@/components/reports/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TeamReportData, ScoringMemberStats } from "@/lib/data/team-report";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@/db/schema";

// ─── Month picker ─────────────────────────────────────────────────────────────

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function buildPeriodUrl(month: number, year: number): string {
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString().slice(0, 10);
  return `?from=${from}&to=${to}`;
}

function PeriodPicker({ periodFrom }: { periodFrom: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const current = new Date(periodFrom);
  const currentMonth = current.getUTCMonth();
  const currentYear = current.getUTCFullYear();

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => thisYear - i);

  const handleChange = useCallback(
    (month: number, year: number) => {
      startTransition(() => {
        router.push(buildPeriodUrl(month, year));
      });
    },
    [router],
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-primary/10 bg-card p-4 shadow-(--shadow-card)">
      <div className="space-y-1.5">
        <Label>Mês</Label>
        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={currentMonth}
          onChange={(e) => handleChange(Number(e.target.value), currentYear)}
          disabled={isPending}
        >
          {MONTHS.map((name, idx) => (
            <option key={idx} value={idx}>{name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>Ano</Label>
        <select
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={currentYear}
          onChange={(e) => handleChange(currentMonth, Number(e.target.value))}
          disabled={isPending}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const now = new Date();
          handleChange(now.getMonth(), now.getFullYear());
        }}
        disabled={isPending}
      >
        Mês atual
      </Button>

      {isPending && (
        <span className="text-xs text-muted-foreground animate-pulse">Carregando...</span>
      )}
    </div>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, rank }: { member: ScoringMemberStats; rank: number }) {
  const isTop = rank === 1 && member.totalPoints > 0;

  return (
    <tr className={`hover:bg-muted/20 ${isTop ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
      <td className="px-4 py-3 text-center">
        {isTop ? (
          <Star className="mx-auto h-4 w-4 fill-amber-400 text-amber-400" />
        ) : (
          <span className="text-sm text-muted-foreground">{rank}</span>
        )}
      </td>
      <td className="px-4 py-3 font-medium">{member.name}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {member.roles.map((r) => (
            <Badge key={r} variant="secondary" className="text-[10px]">
              {ROLE_LABELS[r as UserRole] ?? r}
            </Badge>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm">
        {member.corteVaoCount > 0 ? (
          <span title={`${member.corteVaoPoints} pts`}>
            {member.corteVaoCount} vão(s)
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm">
        {member.transporteVaoCount > 0 ? (
          <span title={`${member.transporteVaoPoints} pts`}>
            {member.transporteVaoCount} vão(s)
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm">
        {member.instalacaoVaoCount > 0 ? (
          <span title={`${member.instalacaoVaoPoints} pts`}>
            {member.instalacaoVaoCount} vão(s)
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-sm">
        {member.medicaoCount > 0 ? (
          <span title={`${member.medicaoPoints} pts`}>
            {member.medicaoCount} OS
          </span>
        ) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-bold text-foreground">
        {member.totalPoints > 0 ? (
          <span className="text-primary">{member.totalPoints} pts</span>
        ) : (
          <span className="text-muted-foreground font-normal">0 pts</span>
        )}
      </td>
    </tr>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function TeamPanel({ data }: { data: TeamReportData }) {
  const searchParams = useSearchParams();
  const periodFrom = data.period.from;

  const totalCorte = data.members.reduce((s, m) => s + m.corteVaoPoints, 0);
  const totalTransporte = data.members.reduce((s, m) => s + m.transporteVaoPoints, 0);
  const totalInstalacao = data.members.reduce((s, m) => s + m.instalacaoVaoPoints, 0);
  const totalMedicao = data.members.reduce((s, m) => s + m.medicaoPoints, 0);

  const periodLabel = (() => {
    const d = new Date(periodFrom);
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  })();

  // Filtra membros que são operacionais (têm algum papel que gera pontuação)
  const operationalRoles = new Set(["cortador", "motorista", "instalador", "medidor"]);
  const operationalMembers = data.members.filter((m) =>
    m.roles.some((r) => operationalRoles.has(r)),
  );

  return (
    <div className="space-y-6">
      <PeriodPicker periodFrom={periodFrom} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total de pontos"
          value={data.totalPoints}
          icon={Trophy}
          description={periodLabel}
        />
        <KpiCard
          label="Pontos em corte"
          value={totalCorte}
          icon={Scissors}
          description="Vãos cortados"
        />
        <KpiCard
          label="Pontos em transporte"
          value={totalTransporte}
          icon={Truck}
          description="Vãos transportados"
        />
        <KpiCard
          label="Pontos em instalação"
          value={totalInstalacao}
          icon={Wrench}
          description="Vãos instalados"
        />
      </div>

      {totalMedicao > 0 && (
        <div className="rounded-xl border border-primary/10 bg-card p-4 shadow-(--shadow-card)">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ruler className="h-4 w-4" />
            <span>Pontos em medições: <strong className="text-foreground">{totalMedicao} pts</strong></span>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-primary/10 bg-card shadow-(--shadow-card)">
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Ranking — {periodLabel}
          </h3>
          <span className="text-xs text-muted-foreground">
            {operationalMembers.filter((m) => m.totalPoints > 0).length} de{" "}
            {operationalMembers.length} colaborador(es) pontuaram
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-center font-semibold w-10">#</th>
                <th className="px-4 py-3 text-left font-semibold">Nome</th>
                <th className="px-4 py-3 text-left font-semibold">Função</th>
                <th className="px-4 py-3 text-right font-semibold">Cortes</th>
                <th className="px-4 py-3 text-right font-semibold">Transportes</th>
                <th className="px-4 py-3 text-right font-semibold">Instalações</th>
                <th className="px-4 py-3 text-right font-semibold">Medições</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {operationalMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum colaborador operacional cadastrado.
                  </td>
                </tr>
              ) : (
                operationalMembers.map((member, idx) => (
                  <MemberRow key={member.userId} member={member} rank={idx + 1} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Gerado em {new Date(data.generatedAt).toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
