"use client";

import { ResolvedImage } from "@/components/ui/resolved-image";
import { filterDisplayableUploadUrls } from "@/lib/upload/displayable-url";
import { cn } from "@/lib/utils";

type PhotoGalleryProps = {
  urls: string[];
  label?: string;
  showLabel?: boolean;
  className?: string;
};

export function PhotoGallery({
  urls,
  label = "Fotos",
  showLabel = true,
  className,
}: PhotoGalleryProps) {
  const displayUrls = filterDisplayableUploadUrls(urls);

  if (displayUrls.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && <p className="text-sm font-medium">{label}</p>}
        <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          Nenhuma foto registrada
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <p className="text-sm font-medium">
          {label}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({displayUrls.length})
          </span>
        </p>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {displayUrls.map((url, index) => (
          <li
            key={`${url}-${index}`}
            className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            <ResolvedImage
              src={url}
              alt={`Foto ${index + 1}`}
              className="h-full w-full object-cover"
              fallbackClassName="flex h-full items-center justify-center text-xs"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
