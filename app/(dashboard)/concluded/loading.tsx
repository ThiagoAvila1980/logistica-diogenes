import { BadgeCheck } from "lucide-react";

export default function ConcludedLoading() {
  return (
    <>
      <header className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-6 w-6 text-muted-foreground/40" aria-hidden />
          <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-1 h-4 w-80 animate-pulse rounded bg-muted" />
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-36 animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-6 w-14 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
