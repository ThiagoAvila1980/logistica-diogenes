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
import type { KanbanPhase } from "@/lib/kanban/column-groups";

type KanbanMobileCarouselProps = {
  phases: readonly KanbanPhase[];
  children: React.ReactNode;
  className?: string;
};

export function KanbanMobileCarousel({
  phases,
  children,
  className,
}: KanbanMobileCarouselProps) {
  const slides = Children.toArray(children).filter(Boolean);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el || count === 0) return;
    const slideWidth = el.clientWidth;
    if (slideWidth <= 0) return;
    const next = Math.min(
      count - 1,
      Math.max(0, Math.round(el.scrollLeft / slideWidth)),
    );
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
    <div className={cn("flex min-h-0 flex-1 flex-col gap-2", className)}>
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Colunas do kanban"
        aria-roledescription="carrossel"
        onScroll={updateIndex}
      >
        {slides.map((slide, i) => (
          <div
            key={phases[i]?.id ?? i}
            className="flex h-full w-full shrink-0 snap-center snap-always flex-col px-0.5"
            aria-hidden={i !== index}
            aria-label={phases[i]?.title}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="flex shrink-0 items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => scrollToIndex(index - 1)}
            disabled={index === 0}
            aria-label="Coluna anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
            {phases.map((phase, i) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => scrollToIndex(i)}
                className="flex h-8 w-8 items-center justify-center"
                aria-label={`Ir para ${phase.title}`}
                aria-current={i === index ? "true" : undefined}
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all",
                    i === index
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/35 hover:bg-muted-foreground/55",
                  )}
                />
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => scrollToIndex(index + 1)}
            disabled={index === count - 1}
            aria-label="Próxima coluna"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
