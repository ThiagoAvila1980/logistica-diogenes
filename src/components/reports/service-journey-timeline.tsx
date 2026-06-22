import { cn } from "@/lib/utils";
import type { ServicePhaseJourney } from "@/lib/reports/service-journey";
import { Check } from "lucide-react";

export function ServiceJourneyTimeline({
  phases,
  compact = false,
  className,
}: {
  phases: ServicePhaseJourney[];
  compact?: boolean;
  className?: string;
}) {
  if (phases.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">Sem etapas registradas</span>
    );
  }

  return (
    <ol
      className={cn(
        "flex flex-wrap items-center gap-1",
        compact && "gap-0.5",
        className,
      )}
      aria-label="Jornada do serviço"
    >
      {phases.map((phase, index) => (
        <li key={phase.phaseId} className="flex items-center gap-1">
          {index > 0 && (
            <span
              className="text-muted-foreground/50"
              aria-hidden
            >
              →
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
              phase.state === "current" &&
                "border-primary/30 bg-primary/10 text-primary",
              phase.state === "completed" &&
                "border-emerald-200 bg-emerald-50 text-emerald-800",
              phase.state === "pending" &&
                "border-dashed border-muted-foreground/25 bg-muted/40 text-muted-foreground",
            )}
          >
            {phase.state === "completed" && (
              <Check className="h-3 w-3 shrink-0" aria-hidden />
            )}
            {phase.shortTitle}
            {phase.state === "current" && !compact && (
              <span className="font-normal text-primary/80">(atual)</span>
            )}
            {phase.state === "pending" && !compact && (
              <span className="font-normal text-muted-foreground/80">
                (pendente)
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
