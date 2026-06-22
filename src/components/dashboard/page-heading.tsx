import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageHeadingProps = {
  title: string;
  count?: number;
  description?: string;
  icon?: LucideIcon;
  backHref?: string;
  backAriaLabel?: string;
  className?: string;
  children?: React.ReactNode;
};

export function PageHeading({
  title,
  count,
  description,
  icon: Icon,
  backHref,
  backAriaLabel = "Voltar",
  className,
  children,
}: PageHeadingProps) {
  return (
    <div className={cn("mb-4 sm:mb-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {backHref ? (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <Link href={backHref} aria-label={backAriaLabel}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            {Icon && (
              <Icon
                className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"
                aria-hidden
              />
            )}
            <h1 className="page-heading">{title}</h1>
            {count != null && count > 0 && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                {count}
              </span>
            )}
          </div>
          <div className="page-heading-rule" aria-hidden />
          {description && (
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground sm:mt-2">
              {description}
            </p>
          )}
        </div>
        {children ? (
          <div className="flex shrink-0 items-center self-start sm:self-auto">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
