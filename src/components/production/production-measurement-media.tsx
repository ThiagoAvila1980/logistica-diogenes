"use client";

import { Images } from "lucide-react";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { DrawingPreview } from "@/components/production/drawing-preview";
import { MediaCarousel } from "@/components/production/media-carousel";
import { MeasurementDimensionsSummary } from "@/components/field/measurement-item-view";

type ProductionMeasurementMediaProps = {
  items: MeasurementLineItem[];
  photos: string[];
  lookups?: MeasurementLookups;
};

type MediaSlide =
  | { kind: "drawing"; item: MeasurementLineItem; index: number }
  | { kind: "photo"; url: string; itemIndex: number; photoIndex: number };

export function ProductionMeasurementMedia({
  items,
  photos,
  lookups,
}: ProductionMeasurementMediaProps) {
  const itemPhotoUrls = new Set(items.flatMap((item) => item.photos ?? []));
  const legacyOnlyPhotos = photos.filter((url) => !itemPhotoUrls.has(url));

  const slides: MediaSlide[] = [
    ...items.flatMap((item, index) => {
      const itemSlides: MediaSlide[] = [
        { kind: "drawing" as const, item, index },
      ];
      for (const [photoIndex, url] of (item.photos ?? []).entries()) {
        itemSlides.push({
          kind: "photo",
          url,
          itemIndex: index,
          photoIndex,
        });
      }
      return itemSlides;
    }),
    ...legacyOnlyPhotos.map((url, photoIndex) => ({
      kind: "photo" as const,
      url,
      itemIndex: -1,
      photoIndex,
    })),
  ];

  const hasSlides = slides.length > 0;

  if (!hasSlides) {
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
                    <div className="border-b bg-card">
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
                <Card
                  key={`photo-${slide.itemIndex}-${slide.photoIndex}-${slide.url}`}
                  className="overflow-hidden"
                >
                  <DrawingPreview
                    src={slide.url}
                    alt={
                      slide.itemIndex >= 0
                        ? `Foto ${slide.photoIndex + 1} — medição ${slide.itemIndex + 1}`
                        : `Foto ${slide.photoIndex + 1}`
                    }
                  />
                  <CardContent className="py-3 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {slide.itemIndex >= 0
                        ? `Medição ${slide.itemIndex + 1} — foto ${slide.photoIndex + 1}`
                        : `Foto ${slide.photoIndex + 1}`}
                    </p>
                  </CardContent>
                </Card>
              ),
            )}
          </MediaCarousel>
        </div>
      )}
    </div>
  );
}
