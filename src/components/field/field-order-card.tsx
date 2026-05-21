import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { OrderListItem } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { cn } from "@/lib/utils";

type FieldOrderCardProps = {
  order: OrderListItem;
};

export function FieldOrderCard({ order }: FieldOrderCardProps) {
  const displayNumber = getOrderDisplayNumber(order);

  return (
    <Link
      href={`/field/${order.id}`}
      className={cn(
        "flex min-h-[88px] items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all",
        "active:scale-[0.98] hover:border-primary/30 hover:shadow-md",
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{displayNumber}</span>
          <PriorityBadge priority={order.priority} />
        </div>
        <p className="truncate font-medium leading-tight">{order.clientName}</p>
        <p className="text-xs text-muted-foreground">
          {STATUS_LABELS[order.status]}
        </p>
        {order.scheduledDate && (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {new Date(order.scheduledDate).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
