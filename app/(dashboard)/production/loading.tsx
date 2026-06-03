export default function ProductionLoading() {
  return (
    <>
      <header className="mb-4 sm:mb-6">
        <div className="h-7 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i}>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-5 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 4 }).map((_, j) => (
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
