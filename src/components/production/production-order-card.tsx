import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { OrderListItem } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { cn } from "@/lib/utils";

const STEP_LABELS = [
  { key: "corte" as const, label: "Corte" },
  { key: "embalagem" as const, label: "Embal." },
  { key: "acessorios" as const, label: "Acess." },
  { key: "vidros" as const, label: "Vidr." },
];

export type ProductionCuttingSteps = {
  corte: boolean;
  embalagem: boolean;
  acessorios: boolean;
  vidros: boolean;
};

type ProductionOrderCardProps = {
  order: OrderListItem;
  steps: ProductionCuttingSteps;
};

export function ProductionOrderCard({
  order,
  steps,
}: ProductionOrderCardProps) {
  const doneCount = Object.values(steps).filter(Boolean).length;
  const allDone = doneCount === 4;

  return (
    <Link
      href={`/production/${order.id}`}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border px-4 py-3 transition-all",
        "hover:border-primary/25 hover:shadow-[var(--shadow-card)] active:scale-[0.98]",
        allDone
          ? "border-success-border bg-success-muted premium-card"
          : "border-primary/10 bg-card premium-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono text-sm font-semibold text-primary">
            {getOrderDisplayNumber(order)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {order.clientName}
          </p>
        </div>
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
  );
}
