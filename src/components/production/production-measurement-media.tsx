"use client";

import { Images, StickyNote } from "lucide-react";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DrawingPreview } from "@/components/production/drawing-preview";
import { MediaCarousel } from "@/components/production/media-carousel";
import { MeasurementDimensionsSummary } from "@/components/field/measurement-item-view";

type ProductionMeasurementMediaProps = {
  items: MeasurementLineItem[];
  photos: string[];
  notes: string | null;
  lookups?: MeasurementLookups;
};

type MediaSlide =
  | { kind: "drawing"; item: MeasurementLineItem; index: number }
  | { kind: "photo"; url: string; index: number };

export function ProductionMeasurementMedia({
  items,
  photos,
  notes,
  lookups,
}: ProductionMeasurementMediaProps) {
  const slides: MediaSlide[] = [
    ...items.map((item, index) => ({ kind: "drawing" as const, item, index })),
    ...photos.map((url, index) => ({ kind: "photo" as const, url, index })),
  ];

  const hasNotes = Boolean(notes?.trim());
  const hasSlides = slides.length > 0;

  if (!hasSlides && !hasNotes) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Medição registrada sem itens ou fotos.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {hasSlides && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Images className="h-4 w-4" />
            Desenhos e fotos
          </h2>
          <MediaCarousel ariaLabel="Carrossel de desenhos e fotos da medição">
            {slides.map((slide) =>
              slide.kind === "drawing" ? (
                <Card
                  key={`drawing-${slide.item.id ?? slide.index}`}
                  className="overflow-hidden"
                >
                  {slide.item.drawingUrl ? (
                    <div className="border-b bg-white">
                      <DrawingPreview
                        src={slide.item.drawingUrl}
                        alt={`Desenho ${slide.index + 1}`}
                      />
                    </div>
                  ) : (
                    <div className="border-b bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                      Sem desenho registrado
                    </div>
                  )}
                  <CardContent className="p-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Medição {slide.index + 1}
                    </p>
                    <MeasurementDimensionsSummary
                      item={slide.item}
                      lookups={lookups}
                      variant="inline"
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card key={`photo-${slide.index}`} className="overflow-hidden">
                  <DrawingPreview
                    src={slide.url}
                    alt={`Foto ${slide.index + 1}`}
                  />
                  <CardContent className="py-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Foto {slide.index + 1}
                    </p>
                  </CardContent>
                </Card>
              ),
            )}
          </MediaCarousel>
        </div>
      )}

      {hasNotes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-4 w-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
