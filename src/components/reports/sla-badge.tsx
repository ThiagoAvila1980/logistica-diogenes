import { cn } from "@/lib/utils";

export type SlaStatus = "ok" | "warning" | "critical";

type SlaBadgeProps = {
  status: SlaStatus;
  label: string;
  className?: string;
};

const STYLES: Record<SlaStatus, string> = {
  ok: "bg-success-subtle text-success-foreground",
  warning: "bg-warning-subtle text-warning-foreground",
  critical: "bg-destructive/10 text-destructive",
};

const DOTS: Record<SlaStatus, string> = {
  ok: "bg-success-foreground",
  warning: "bg-warning-foreground",
  critical: "bg-destructive",
};

export function SlaBadge({ status, label, className }: SlaBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold",
        STYLES[status],
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", DOTS[status])}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** Converte dias em atraso para status SLA. */
export function daysToSlaStatus(days: number): SlaStatus {
  if (days <= 3) return "ok";
  if (days <= 7) return "warning";
  return "critical";
}
