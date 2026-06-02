import Link from "next/link";
import { CalendarDays, ChevronRight, Truck } from "lucide-react";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { OrderListItem } from "@/lib/data/types";
import type { LogisticsSummary } from "@/lib/data/logistics";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type LogisticsOrderCardProps = {
  order: OrderListItem;
  logistics?: LogisticsSummary | null;
};

export function LogisticsOrderCard({
  order,
  logistics,
}: LogisticsOrderCardProps) {
  const vehicleLabel =
    logistics?.vehiclePlate != null
      ? logistics.vehicleDescription
        ? `${logistics.vehicleDescription} (${logistics.vehiclePlate})`
        : logistics.vehiclePlate
      : order.status.startsWith("transporte_") && order.status !== "transporte_levar_vidro"
        ? "Veículo não atribuído"
        : null;

  return (
    <Link
      href={`/logistics/${order.id}`}
      className={cn(
        "flex min-h-[88px] items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all",
        "active:scale-[0.98] hover:border-primary/30 hover:shadow-md",
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">
            {getOrderDisplayNumber(order)}
          </span>
          <PriorityBadge priority={order.priority} />
        </div>
        <p className="truncate font-medium leading-tight">{order.clientName}</p>
        <p className="text-xs text-muted-foreground">
          {STATUS_LABELS[order.status]}
        </p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {vehicleLabel && (
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1",
                order.status.startsWith("transporte_") &&
                  order.status !== "transporte_levar_vidro" &&
                  !logistics?.vehiclePlate &&
                  "text-warning",
              )}
            >
              <Truck className="h-3 w-3 shrink-0" />
              <span className="truncate">{vehicleLabel}</span>
            </span>
          )}
          {order.scheduledDate && (
            <span className="inline-flex items-center gap-1">
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
