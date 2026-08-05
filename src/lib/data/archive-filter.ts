export type ArchiveFilter = "active" | "archived" | "all";

export function matchesArchiveFilter(
  archivedAt: Date | null | undefined,
  filter: ArchiveFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "archived") return archivedAt != null;
  return archivedAt == null;
}
