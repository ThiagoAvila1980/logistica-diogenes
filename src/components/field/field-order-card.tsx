"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Package } from "lucide-react";
import type { OrderListItem } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import { PrintMeasurementMenu } from "@/components/field/print-measurement-menu";
import { PendingBadge } from "@/components/offline/pending-badge";
import {
  PEDIDO_STATUS_LABEL,
  PEDIDO_STATUS_STYLE,
} from "@/lib/pedido/pedido-status";

const PRIORITY_BORDER: Record<string, string> = {
  urgente: "border-l-[3px] border-l-destructive",
  alta: "border-l-[3px] border-l-brass",
  normal: "border-l-[3px] border-l-primary/20",
};

const PRIORITY_PILL: Record<string, string | undefined> = {
  urgente: "bg-destructive/10 text-destructive",
  alta: "bg-brass-subtle text-brass-foreground",
};

const PRIORITY_LABEL: Record<string, string> = {
  urgente: "Urgente",
  alta: "Alta",
};

type FieldOrderCardProps = {
  order: OrderListItem;
};

export function FieldOrderCard({ order }: FieldOrderCardProps) {
  const displayNumber = getOrderDisplayNumber(order);
  const isFinal = order.type === "final";
  const priorityPill = PRIORITY_PILL[order.priority];

  return (
    <div
      className={cn(
        "group flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-primary/10 bg-card shadow-(--shadow-card) transition-all",
        "hover:border-primary/30 hover:shadow-(--shadow-brand)",
        PRIORITY_BORDER[order.priority],
      )}
    >
      {/* Linha principal: informações da medição */}
      <div className="flex min-w-0 items-center gap-1 p-4">
        <Link
          href={`/field/${order.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 active:scale-[0.98]"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-mono text-sm font-semibold text-primary">
                {displayNumber}
              </span>
              {priorityPill && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                    priorityPill,
                  )}
                >
                  {PRIORITY_LABEL[order.priority]}
                </span>
              )}
            </div>

            <p
              className="truncate font-medium leading-tight"
              title={order.clientName}
            >
              {order.clientName}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  order.hasMeasurement
                    ? "bg-success-subtle text-success-foreground"
                    : "bg-primary/8 text-primary",
                )}
              >
                {order.hasMeasurement ? "Medida" : "Pendente"}
              </span>

              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  isFinal
                    ? "bg-brass-subtle text-brass-foreground ring-1 ring-brass-border/60"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {isFinal ? "Final" : "Orçamento"}
              </span>

              {order.scheduledDate && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {formatBrDate(order.scheduledDate)}
                </span>
              )}

              <PendingBadge osId={order.id} />
            </div>
          </div>

          <ChevronRight className="h-5 w-5 shrink-0 text-primary/30 transition-colors group-hover:text-primary" />
        </Link>

        <PrintMeasurementMenu osId={order.id} />
      </div>

      {/* Linha de pedido: somente para medições do tipo orçamento */}
      {!isFinal && (
        <>
          <div className="mx-4 border-t border-border/60" />
          <Link
            href={`/field/${order.id}/pedidos`}
            className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-primary/5 active:scale-[0.99]"
            onClick={(e) => e.stopPropagation()}
          >
            <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                PEDIDO_STATUS_STYLE[order.pedidoStatus],
              )}
            >
              {PEDIDO_STATUS_LABEL[order.pedidoStatus]}
            </span>
          </Link>
        </>
      )}
    </div>
  );
}
