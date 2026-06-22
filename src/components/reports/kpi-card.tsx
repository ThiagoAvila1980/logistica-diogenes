import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Trend = "up" | "down" | "neutral";

type KpiCardProps = {
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: Trend;
  trendLabel?: string;
  className?: string;
};

export function KpiCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-primary/10 bg-card p-5 shadow-(--shadow-card)",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-primary/60" aria-hidden />
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      {(description || trendLabel) && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {trendLabel && trend && (
            <span
              className={cn(
                "text-xs font-semibold",
                trend === "up" && "text-success-foreground",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground",
              )}
            >
              {trendLabel}
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  );
}
