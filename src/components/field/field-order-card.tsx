import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { OrderListItem } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

const PRIORITY_BORDER: Record<string, string> = {
  urgente: "border-l-[3px] border-l-red-500",
  alta: "border-l-[3px] border-l-amber-500",
  normal: "border-l-[3px] border-l-transparent",
  baixa: "border-l-[3px] border-l-transparent",
};

const PRIORITY_PILL: Record<string, string | undefined> = {
  urgente:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  alta: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
  const isFinal = order.status === "medicao_final";
  const priorityPill = PRIORITY_PILL[order.priority];

  return (
    <Link
      href={`/field/${order.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all",
        "active:scale-[0.98] hover:border-primary/30 hover:shadow-md",
        PRIORITY_BORDER[order.priority],
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-muted-foreground">
            {displayNumber}
          </span>
          {priorityPill && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                priorityPill,
              )}
            >
              {PRIORITY_LABEL[order.priority]}
            </span>
          )}
        </div>

        <p className="truncate font-medium leading-tight">{order.clientName}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              order.hasMeasurement
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {order.hasMeasurement ? "Medida" : "Pendente"}
          </span>

          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              isFinal
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
