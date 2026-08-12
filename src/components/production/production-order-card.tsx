import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { OrderListItem } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { cn } from "@/lib/utils";
import type { CuttingSteps } from "@/lib/transport-gates";

const STEP_LABELS: { key: keyof CuttingSteps; label: string }[] = [
  { key: "corteFeito", label: "Corte" },
  { key: "embalagemFeita", label: "Embal." },
  { key: "acessoriosFeitos", label: "Acess." },
  { key: "vidrosFeitos", label: "Vidr." },
];

type ProductionOrderCardProps = {
  order: OrderListItem;
  steps: CuttingSteps;
  actions?: ReactNode;
};

export function ProductionOrderCard({
  order,
  steps,
  actions,
}: ProductionOrderCardProps) {
  const doneCount = Object.values(steps).filter(Boolean).length;
  const allDone = doneCount === 4;
  const href = `/production/${order.id}`;

  return (
    <div
      className={cn(
        "group flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden rounded-xl border px-4 py-3 transition-all",
        "hover:border-primary/25 hover:shadow-(--shadow-card)",
        allDone
          ? "border-success-border bg-success-muted premium-card"
          : "border-primary/10 bg-card premium-card",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <Link
          href={href}
          className="flex min-w-0 flex-1 items-center active:scale-[0.98]"
        >
          <p className="font-mono text-sm font-semibold text-primary">
            {getOrderDisplayNumber(order)}
          </p>
        </Link>
        {actions}
      </div>

      <Link
        href={href}
        className="flex min-w-0 flex-1 flex-col gap-3 active:scale-[0.98]"
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
            title={order.clientName}
          >
            {order.clientName}
          </p>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary/30 transition-colors group-hover:text-primary" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STEP_LABELS.map(({ key, label }) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                steps[key]
                  ? "bg-success-subtle text-success-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </Link>
    </div>
  );
}
