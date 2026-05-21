export default function KanbanLoading() {
  return (
    <div className="flex h-full min-h-[40vh] flex-col gap-3 p-2 lg:p-3">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-2 grid flex-1 grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-md bg-muted/50 p-2">
            <div className="mb-2 h-4 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded bg-muted" />
              <div className="h-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
