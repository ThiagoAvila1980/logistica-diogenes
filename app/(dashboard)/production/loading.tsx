export default function ProductionLoading() {
  return (
    <>
      <header className="mb-4 sm:mb-6">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
      </header>
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i}>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex shrink-0 gap-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
