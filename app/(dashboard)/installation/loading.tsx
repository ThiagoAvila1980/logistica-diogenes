import { Wrench } from "lucide-react";

export default function InstallationLoading() {
  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-muted-foreground/40" aria-hidden />
          <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-1 h-4 w-80 animate-pulse rounded bg-muted" />
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-36 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="flex gap-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
