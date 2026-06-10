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

type Props = {
  notes: string | null;
  className?: string;
  collapsible?: boolean;
};

export function MeasurementNotesCard({
  notes,
  className,
  collapsible = false,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!notes?.trim()) return null;

  const trimmedNotes = notes.trim();

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
            aria-controls="measurement-notes-panel"
          >
            <CardTitle className="flex min-w-0 items-center gap-2 text-base">
              <StickyNote className="h-4 w-4 shrink-0 text-warning" />
              <span className="truncate">Observações da medição</span>
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
          <CardContent id="measurement-notes-panel">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {trimmedNotes}
            </p>
          </CardContent>
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
          Observações da medição
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {trimmedNotes}
        </p>
      </CardContent>
    </Card>
  );
}
