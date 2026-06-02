import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { OrderListItem } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

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
    <Link
      href={`/field/${order.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-primary/10 bg-card p-4 shadow-[var(--shadow-card)] transition-all",
        "active:scale-[0.98] hover:border-primary/30 hover:shadow-[var(--shadow-brand)]",
        PRIORITY_BORDER[order.priority],
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">
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
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-primary/30 transition-colors group-hover:text-primary" />
    </Link>
  );
}
