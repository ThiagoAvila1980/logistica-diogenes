"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronRight, MapPin, Phone, User } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  brDateToIso,
  formatBrDate,
  isCompleteBrDate,
  isoDateToBr,
} from "@/lib/date-format";
import {
  AGENDA_STATUS_LABELS,
  agendaVaoStatus,
  type AgendaInstallerGroup,
  type AgendaVaoItem,
  type AgendaVaoWorkStatus,
} from "@/lib/installation/agenda";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<AgendaVaoWorkStatus, string> = {
  a_fazer: "bg-muted text-muted-foreground",
  em_andamento: "bg-warning-subtle text-warning-foreground",
  concluido: "bg-success-subtle text-success-foreground",
};

type Props = {
  selectedDate: string;
  todayIso: string;
  groups: AgendaInstallerGroup[];
  groupByInstaller: boolean;
  dayVaoCount: number;
};

function weekdayLong(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
  }).format(new Date(year, month - 1, day));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function InstallationAgenda({
  selectedDate,
  todayIso,
  groups,
  groupByInstaller,
  dayVaoCount,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => isoDateToBr(selectedDate));

  useEffect(() => {
    setDraft(isoDateToBr(selectedDate));
  }, [selectedDate]);

  function goToDate(nextDate: string) {
    if (nextDate === todayIso) {
      router.replace("/installation/agenda");
      return;
    }
    router.replace(`/installation/agenda?date=${nextDate}`);
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title="Agenda do dia"
        count={dayVaoCount}
        description="Instalações agendadas na data escolhida."
        icon={CalendarDays}
      />

      <section
        className="flex flex-wrap items-end gap-2"
        aria-label="Filtro de data"
      >
        <div className="w-[12rem]">
          <label
            htmlFor="agenda-date"
            className="mb-0.5 block text-xs text-muted-foreground"
          >
            Data
          </label>
          <DateInput
            id="agenda-date"
            value={draft}
            onValueChange={(next) => {
              setDraft(next);
              if (!isCompleteBrDate(next)) return;
              const iso = brDateToIso(next);
              if (iso && iso !== selectedDate) goToDate(iso);
            }}
            aria-label="Filtrar instalações por data"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          disabled={selectedDate === todayIso}
          onClick={() => goToDate(todayIso)}
        >
          Hoje
        </Button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">
            {weekdayLong(selectedDate)}, {formatBrDate(selectedDate)}
          </h2>
          <p className="text-xs text-muted-foreground">
            {dayVaoCount === 0
              ? "Nenhuma instalação agendada neste dia."
              : `${dayVaoCount} vão${dayVaoCount === 1 ? "" : "s"} agendado${dayVaoCount === 1 ? "" : "s"}`}
          </p>
        </div>

        {dayVaoCount === 0 ? null : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.installerId ?? "sem-instalador"} className="space-y-2">
                {groupByInstaller ? (
                  <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {group.installerName ?? "Sem instalador"}
                  </h3>
                ) : null}
                <ul className="grid gap-3">
                  {group.orders.map((order) => (
                    <li key={`${group.installerId ?? "none"}-${order.osId}`}>
                      <AgendaOrderCard order={order} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AgendaOrderCard({
  order,
}: {
  order: AgendaInstallerGroup["orders"][number];
}) {
  return (
    <Link
      href={`/installation/${order.osId}`}
      className={cn(
        "group flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-primary/10 bg-card p-4 shadow-(--shadow-card) transition-all premium-card",
        "active:scale-[0.98] hover:border-primary/30 hover:shadow-(--shadow-brand)",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5 overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="shrink-0 font-mono text-sm font-semibold text-primary">
              {order.displayNumber}
            </span>
            <PriorityBadge priority={order.priority} />
          </div>
          <p className="truncate font-medium leading-tight" title={order.clientName}>
            {order.clientName}
          </p>
          {order.clientAddress ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{order.clientAddress}</span>
            </p>
          ) : null}
          {order.clientPhone ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{order.clientPhone}</span>
            </p>
          ) : null}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-primary/30 transition-colors group-hover:text-primary" />
      </div>

      <ul className="space-y-1.5">
        {order.vaos.map((vao) => (
          <AgendaVaoRow key={vao.itemId} vao={vao} />
        ))}
      </ul>
    </Link>
  );
}

function AgendaVaoRow({ vao }: { vao: AgendaVaoItem }) {
  const status = agendaVaoStatus(vao);

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs",
        status === "concluido" && "opacity-60",
      )}
    >
      <span className="font-medium">Vão {vao.vaoNumber}</span>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
          STATUS_CLASS[status],
        )}
      >
        {AGENDA_STATUS_LABELS[status]}
      </span>
    </li>
  );
}
