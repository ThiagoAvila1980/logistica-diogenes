import { Badge } from "@/components/ui/badge";
import type { MeasurementPriority } from "@/db/schema";
import { cn } from "@/lib/utils";

const LABELS: Record<MeasurementPriority, string> = {
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: MeasurementPriority;
  className?: string;
}) {
  return (
    <Badge
      variant={priority === "urgente" ? "destructive" : "secondary"}
      className={cn(className)}
    >
      {LABELS[priority]}
    </Badge>
  );
}
