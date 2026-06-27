import Link from "next/link";
import { CalendarDays, ChevronRight, User } from "lucide-react";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import {
  INSTALLATION_STEP_LABELS,
  WorkflowStepBadges,
} from "@/components/dashboard/workflow-step-badges";
import type { OrderListItem } from "@/lib/data/types";
import type { InstallationSummary } from "@/lib/data/installation";
import type { InstallationSteps } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { formatBrDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";

type InstallationOrderCardProps = {
  order: OrderListItem;
  installation?: InstallationSummary | null;
  installationSteps?: InstallationSteps | null;
};

export function InstallationOrderCard({
  order,
  installation,
  installationSteps,
}: InstallationOrderCardProps) {
  const installerLabel = installation?.installerName ?? "Sem instalador";
  const dateLabel = installation?.scheduledDate
    ? formatBrDate(installation.scheduledDate)
    : "Sem data";

  const stepBadges = INSTALLATION_STEP_LABELS.map(({ key, label }) => ({
    label,
    done: installationSteps?.[key] ?? false,
  }));

  return (
    <Link
      href={`/installation/${order.id}`}
      className={cn(
        "group flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-primary/10 bg-card p-4 shadow-(--shadow-card) transition-all premium-card",
        "active:scale-[0.98] hover:border-primary/30 hover:shadow-(--shadow-brand)",
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
        <span className="inline-flex max-w-full items-center gap-1">
          <User
            className={cn(
              "h-3 w-3 shrink-0",
              installation?.installerName ? "text-info" : "text-destructive",
            )}
          />
          <span
            className={cn(
              "truncate",
              !installation?.installerName && "text-destructive",
            )}
          >
            {installerLabel}
          </span>
        </span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays
            className={cn(
              "h-3 w-3 shrink-0",
              installation?.scheduledDate ? "text-brass" : "text-destructive",
            )}
          />
          <span className={cn(!installation?.scheduledDate && "text-destructive")}>
            {dateLabel}
          </span>
        </span>
      </div>
    </Link>
  );
}
