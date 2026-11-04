import { CalendarDays } from "lucide-react";

export default function InstallationAgendaLoading() {
  return (
    <div className="space-y-4">
      <header className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-muted-foreground/40" aria-hidden />
          <div className="h-7 w-36 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-muted" />
      </header>
      <div className="flex items-end gap-2">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-16 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}
