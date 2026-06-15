import Link from "next/link";
import { CalendarDays, ChevronRight, Truck } from "lucide-react";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import {
  TRANSPORT_STEP_LABELS,
  WorkflowStepBadges,
} from "@/components/dashboard/workflow-step-badges";
import type { OrderListItem } from "@/lib/data/types";
import type { LogisticsSummary } from "@/lib/data/logistics";
import type { TransportSteps } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type LogisticsOrderCardProps = {
  order: OrderListItem;
  logistics?: LogisticsSummary | null;
  transportSteps?: TransportSteps | null;
};

export function LogisticsOrderCard({
  order,
  logistics,
  transportSteps,
}: LogisticsOrderCardProps) {
  const vehicleLabel =
    logistics?.vehiclePlate != null
      ? logistics.vehicleDescription
        ? `${logistics.vehicleDescription} (${logistics.vehiclePlate})`
        : logistics.vehiclePlate
      : order.status.startsWith("transporte_") && order.status !== "transporte_levar_vidro"
        ? "Veículo não atribuído"
        : null;

  const stepBadges = TRANSPORT_STEP_LABELS.map(({ key, label }) => ({
    label,
    done: transportSteps?.[key] ?? false,
  }));

  return (
    <Link
      href={`/logistics/${order.id}`}
      className={cn(
        "group flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-primary/10 bg-card p-4 shadow-[var(--shadow-card)] transition-all premium-card",
        "active:scale-[0.98] hover:border-primary/30 hover:shadow-[var(--shadow-brand)]",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2 overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="shrink-0 font-mono text-sm font-semibold text-primary">
              {getOrderDisplayNumber(order)}
            </span>
            <PriorityBadge priority={order.priority} />
          </div>
          <p
            className="truncate font-medium leading-tight"
            title={order.clientName}
          >
            {order.clientName}
          </p>
          <WorkflowStepBadges steps={stepBadges} />
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-primary/30 transition-colors group-hover:text-primary" />
      </div>
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
    </Link>
  );
}
