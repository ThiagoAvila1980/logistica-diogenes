"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatStepAuditLabel,
  type StepCompletionMeta,
  type StepCompletionMetaMap,
} from "@/lib/audit/format-step-audit";

export function getStepAuditMeta(
  map: StepCompletionMetaMap | undefined,
  itemId: string,
  step: string,
): StepCompletionMeta | undefined {
  return map?.[itemId]?.[step];
}

/** Texto inline abaixo do step (transporte / instalação). */
export function StepAuditLine({
  meta,
  className,
}: {
  meta: StepCompletionMeta | undefined;
  className?: string;
}) {
  if (!meta) return null;
  return (
    <p className={className ?? "mt-1 text-[11px] leading-snug text-muted-foreground"}>
      {formatStepAuditLabel(meta)}
    </p>
  );
}

/** Envolve o checkbox com tooltip (corte / instalação desktop). */
export function StepAuditTooltip({
  meta,
  children,
}: {
  meta: StepCompletionMeta | undefined;
  children: React.ReactNode;
}) {
  if (!meta) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {formatStepAuditLabel(meta)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
