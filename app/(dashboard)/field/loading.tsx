import { ORDER_INDEX_GRID_CLASS } from "@/lib/ui/order-index-grid";

export default function FieldLoading() {
  return (
    <>
      <header className="mb-4 sm:mb-6">
        <div className="h-7 w-44 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
      </header>
      <ul className={ORDER_INDEX_GRID_CLASS}>
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
