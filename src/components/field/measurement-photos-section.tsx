"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type MeasurementPhotosSectionProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  photoCount: number;
  children: React.ReactNode;
};

export function MeasurementPhotosSection({
  expanded,
  onExpandedChange,
  photoCount,
  children,
}: MeasurementPhotosSectionProps) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Fotos</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
          aria-controls="measurement-photos-body"
          aria-label={expanded ? "Recolher fotos" : "Expandir fotos"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!expanded && (
        <p className="mt-2 text-xs text-muted-foreground">
          {photoCount > 0
            ? `${photoCount} foto${photoCount === 1 ? "" : "s"} registrada${photoCount === 1 ? "" : "s"}`
            : "Nenhuma foto registrada"}
        </p>
      )}

      {expanded && (
        <div id="measurement-photos-body" className="mt-3">
          {children}
        </div>
      )}
    </section>
  );
}
