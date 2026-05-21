import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { OsStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Partial<
  Record<OsStatus, "default" | "secondary" | "destructive" | "outline">
> = {
  revisao: "destructive",
  concluido: "secondary",
};

export function OsStatusBadge({
  status,
  className,
}: {
  status: OsStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={STATUS_VARIANT[status] ?? "outline"}
      className={cn("whitespace-nowrap", className)}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
