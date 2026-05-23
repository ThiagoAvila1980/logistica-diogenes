"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MediaCarouselProps = {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
};

export function MediaCarousel({
  children,
  ariaLabel,
  className,
}: MediaCarouselProps) {
  const slides = Children.toArray(children).filter(Boolean);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || count === 0) return;
    const slideWidth = el.clientWidth;
    if (slideWidth <= 0) return;
    const next = Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / slideWidth)));
    setIndex(next);
  }, [count]);

  useEffect(() => {
    updateIndex();
  }, [count, updateIndex]);

  function scrollToIndex(next: number) {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.min(count - 1, Math.max(0, next));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  }

  if (count === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={ariaLabel}
        aria-roledescription="carrossel"
        onScroll={updateIndex}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0 snap-center snap-always"
            aria-hidden={i !== index}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => scrollToIndex(index - 1)}
              disabled={index === 0}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === index
                      ? "w-5 bg-primary"
                      : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55",
                  )}
                  aria-label={`Ir para slide ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => scrollToIndex(index + 1)}
              disabled={index === count - 1}
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="mt-2 text-center text-xs tabular-nums text-muted-foreground">
            {index + 1} / {count}
          </p>
        </>
      )}
    </div>
  );
}
