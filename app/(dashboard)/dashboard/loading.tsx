export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-2 lg:p-3">
      <div className="shrink-0 space-y-2">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="flex gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-2 sm:gap-2 md:grid md:grid-cols-4 md:overflow-x-visible">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="w-[11.5rem] min-w-[11.5rem] shrink-0 rounded-md bg-muted/50 p-1.5 sm:w-[12.5rem] sm:min-w-[12.5rem] md:w-auto md:min-w-0 md:shrink"
          >
            <div className="mb-2 h-4 animate-pulse rounded bg-muted" />
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-16 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
