import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";
import type { MeasurementDbStatus, OsStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

const STATUS_VARIANT: Partial<
  Record<OsStatus, "default" | "secondary" | "destructive" | "outline">
> = {
  concluido: "secondary",
};

const MEASUREMENT_STATUS_LABEL: Record<MeasurementDbStatus, string> = {
  pendente: "Pendente",
  medida: "Medida",
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

export function MeasurementStatusBadge({
  status,
  className,
}: {
  status: MeasurementDbStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={status === "medida" ? "secondary" : "outline"}
      className={cn("whitespace-nowrap", className)}
    >
      {MEASUREMENT_STATUS_LABEL[status]}
    </Badge>
  );
}
