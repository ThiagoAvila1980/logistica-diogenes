"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export type DrawingPreviewGalleryItem = {
  src: string;
  alt: string;
};

type DrawingPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  variant?: "drawing" | "thumbnail";
  /** Lista para navegar no lightbox como carrossel. */
  gallery?: DrawingPreviewGalleryItem[];
  /** Índice desta imagem na gallery. */
  galleryIndex?: number;
};

function getTouchDistance(touches: React.TouchList) {
  if (touches.length < 2) return 0;
  const [a, b] = [touches[0]!, touches[1]!];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function PinchZoomImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const gestureRef = useRef<{
    mode: "none" | "pinch" | "pan";
    startDistance: number;
    startScale: number;
    panStartX: number;
    panStartY: number;
  }>({
    mode: "none",
    startDistance: 0,
    startScale: 1,
    panStartX: 0,
    panStartY: 0,
  });

  scaleRef.current = scale;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventScroll = (event: TouchEvent) => {
      if (event.touches.length >= 2 || scaleRef.current > 1) {
        event.preventDefault();
      }
    };

    el.addEventListener("touchmove", preventScroll, { passive: false });
    return () => el.removeEventListener("touchmove", preventScroll);
  }, []);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touches = event.touches;

    if (touches.length === 2) {
      gestureRef.current = {
        mode: "pinch",
        startDistance: getTouchDistance(touches),
        startScale: scale,
        panStartX: position.x,
        panStartY: position.y,
      };
      return;
    }

    if (touches.length === 1 && scale > 1) {
      gestureRef.current = {
        ...gestureRef.current,
        mode: "pan",
        panStartX: touches[0]!.clientX - position.x,
        panStartY: touches[0]!.clientY - position.y,
        startDistance: 0,
        startScale: scale,
      };
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const touches = event.touches;
    const gesture = gestureRef.current;

    if (touches.length === 2 && gesture.mode === "pinch" && gesture.startDistance > 0) {
      const distance = getTouchDistance(touches);
      const nextScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, gesture.startScale * (distance / gesture.startDistance)),
      );
      setScale(nextScale);
      if (nextScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return;
    }

    if (touches.length === 1 && gesture.mode === "pan" && scale > 1) {
      setPosition({
        x: touches[0]!.clientX - gesture.panStartX,
        y: touches[0]!.clientY - gesture.panStartY,
      });
    }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length < 2) {
      gestureRef.current.mode = event.touches.length === 1 && scale > 1 ? "pan" : "none";
    }
    if (scale <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex max-h-[calc(95vh-3rem)] min-h-[200px] touch-none items-center justify-center overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <ResolvedImage
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-[calc(95vh-3rem)] w-full select-none object-contain will-change-transform"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
      />
    </div>
  );
}

function resolveInitialIndex(
  src: string,
  gallery: DrawingPreviewGalleryItem[] | undefined,
  galleryIndex: number | undefined,
): number {
  if (!gallery?.length) return 0;
  if (
    typeof galleryIndex === "number" &&
    galleryIndex >= 0 &&
    galleryIndex < gallery.length
  ) {
    return galleryIndex;
  }
  const found = gallery.findIndex((item) => item.src === src);
  return found >= 0 ? found : 0;
}

export function DrawingPreview({
  src,
  alt,
  className,
  variant = "drawing",
  gallery,
  galleryIndex,
}: DrawingPreviewProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    resolveInitialIndex(src, gallery, galleryIndex),
  );
  const isThumbnail = variant === "thumbnail";

  const slides =
    gallery && gallery.length > 0
      ? gallery
      : [{ src, alt }];
  const canNavigate = slides.length > 1;
  const active = slides[activeIndex] ?? slides[0]!;

  function openAtCurrent() {
    setActiveIndex(resolveInitialIndex(src, gallery, galleryIndex));
    setOpen(true);
  }

  function goTo(delta: number) {
    if (!canNavigate) return;
    setActiveIndex((current) => (current + delta + slides.length) % slides.length);
  }

  useEffect(() => {
    if (!open || slides.length <= 1) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex(
          (current) => (current - 1 + slides.length) % slides.length,
        );
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % slides.length);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, slides.length]);

  return (
    <>
      <button
        type="button"
        onClick={openAtCurrent}
        className={cn(
          "group relative block cursor-zoom-in border-0 p-0 text-left",
          isThumbnail
            ? "h-32 w-full overflow-hidden rounded-lg border bg-muted sm:h-36"
            : "w-full bg-card",
          className,
        )}
        aria-label={`Ampliar ${alt}`}
      >
        <ResolvedImage
          src={src}
          alt={alt}
          className={
            isThumbnail
              ? "h-full w-full object-contain transition-transform group-hover:scale-105"
              : "mx-auto max-h-[min(70vh,480px)] w-full object-contain"
          }
        />
        <span
          className={cn(
            "pointer-events-none absolute flex items-center gap-1 rounded-md bg-overlay/60 px-2 py-1 text-xs font-medium text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
            isThumbnail ? "bottom-2 right-2" : "bottom-3 right-3",
          )}
        >
          <Expand className="h-3.5 w-3.5" aria-hidden />
          Ampliar
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95vh] w-[min(96vw,1200px)] max-w-[96vw] gap-0 overflow-hidden p-2 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3 pr-10">
            <DialogTitle className="truncate text-sm font-medium">
              {active.alt}
            </DialogTitle>
            {canNavigate && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {activeIndex + 1} / {slides.length}
              </span>
            )}
          </div>

          <div className="relative">
            {open ? (
              <PinchZoomImage
                key={`${active.src}-${activeIndex}`}
                src={active.src}
                alt={active.alt}
              />
            ) : null}

            {canNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(-1)}
                  className="absolute left-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:left-2"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="absolute right-1 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-2"
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
