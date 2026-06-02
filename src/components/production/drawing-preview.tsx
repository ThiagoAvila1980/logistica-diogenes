"use client";

import { useEffect, useRef, useState } from "react";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResolvedImage } from "@/components/ui/resolved-image";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type DrawingPreviewProps = {
  src: string;
  alt: string;
  className?: string;
  variant?: "drawing" | "thumbnail";
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

export function DrawingPreview({
  src,
  alt,
  className,
  variant = "drawing",
}: DrawingPreviewProps) {
  const [open, setOpen] = useState(false);
  const isThumbnail = variant === "thumbnail";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative block cursor-zoom-in border-0 p-0 text-left",
          isThumbnail
            ? "aspect-square w-full overflow-hidden rounded-lg border bg-muted"
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
              ? "h-full w-full object-cover transition-transform group-hover:scale-105"
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
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {open ? <PinchZoomImage src={src} alt={alt} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
