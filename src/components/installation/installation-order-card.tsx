import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import {
  INSTALLATION_STEP_LABELS,
  WorkflowStepBadges,
} from "@/components/dashboard/workflow-step-badges";
import type { OrderListItem } from "@/lib/data/types";
import type { InstallationSteps } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type InstallationOrderCardProps = {
  order: OrderListItem;
  installationSteps?: InstallationSteps | null;
};

export function InstallationOrderCard({
  order,
  installationSteps,
}: InstallationOrderCardProps) {
  const stepBadges = INSTALLATION_STEP_LABELS.map(({ key, label }) => ({
    label,
    done: installationSteps?.[key] ?? false,
  }));

  return (
    <Link
      href={`/installation/${order.id}`}
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
      {order.scheduledDate && (
        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {formatBrDate(order.scheduledDate)}
        </p>
      )}
    </Link>
  );
}
