"use client";

import { useState } from "react";
import { ChevronDown, StickyNote } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { UpstreamObservation } from "@/lib/workflow/upstream-observations";

type UpstreamObservationsCardProps = {
  observations: UpstreamObservation[];
  className?: string;
  collapsible?: boolean;
};

export function UpstreamObservationsCard({
  observations,
  className,
  collapsible = false,
}: UpstreamObservationsCardProps) {
  const [open, setOpen] = useState(false);

  if (observations.length === 0) return null;

  const title =
    observations.length === 1
      ? observations[0]!.label
      : "Observações das etapas anteriores";

  const body = (
    <div className="space-y-3">
      {observations.map((observation) => (
        <div key={observation.source} className="min-w-0">
          {observations.length > 1 ? (
            <p className="text-xs font-semibold text-foreground">
              {observation.label}
            </p>
          ) : null}
          <p
            className={cn(
              "whitespace-pre-wrap text-sm text-muted-foreground",
              observations.length > 1 && "mt-0.5",
            )}
          >
            {observation.text}
          </p>
        </div>
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <Card
        className={cn(
          "mb-4 min-w-0 overflow-hidden border-warning-border bg-warning-muted/60",
          className,
        )}
      >
        <CardHeader className="p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-6 pt-3 pb-3 text-left"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="upstream-observations-panel"
          >
            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 shrink-0 text-warning" />
              <span className="truncate">{title}</span>
            </CardTitle>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </CardHeader>
        {open && (
          <CardContent id="upstream-observations-panel">{body}</CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "min-w-0 overflow-hidden border-warning-border bg-warning-muted/50",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-warning" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}

type VaoUpstreamObservationsProps = {
  observations: UpstreamObservation[];
  className?: string;
  compact?: boolean;
};

export function VaoUpstreamObservations({
  observations,
  className,
  compact = false,
}: VaoUpstreamObservationsProps) {
  if (observations.length === 0) return null;

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-md border border-warning-border/70 bg-warning-muted/50 p-2.5",
        className,
      )}
    >
      {observations.map((observation) => (
        <p
          key={observation.source}
          className={cn(
            "text-xs text-muted-foreground",
            compact && "line-clamp-2",
          )}
        >
          <span className="not-italic font-medium text-foreground">
            {observation.label}
          </span>
          {": "}
          <span className="whitespace-pre-wrap italic">{observation.text}</span>
        </p>
      ))}
    </div>
  );
}
