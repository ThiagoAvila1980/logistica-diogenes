import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LABELS = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
} as const;

export function PriorityBadge({
  priority,
  className,
}: {
  priority: keyof typeof LABELS;
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
