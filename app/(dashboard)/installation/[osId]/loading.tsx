export default function InstallationOsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="h-7 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-52 animate-pulse rounded bg-muted" />
      </div>
      {/* Checklist skeleton */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="h-3 w-12 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex gap-4">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-5 w-5 animate-pulse rounded bg-muted" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
