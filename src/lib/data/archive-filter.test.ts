import { describe, expect, it } from "vitest";
import { matchesArchiveFilter } from "./archive-filter";

describe("matchesArchiveFilter", () => {
  const archivedDate = new Date("2026-01-15T10:00:00Z");

  it("active: só sem archivedAt", () => {
    expect(matchesArchiveFilter(null, "active")).toBe(true);
    expect(matchesArchiveFilter(undefined, "active")).toBe(true);
    expect(matchesArchiveFilter(archivedDate, "active")).toBe(false);
  });

  it("archived: só com archivedAt", () => {
    expect(matchesArchiveFilter(archivedDate, "archived")).toBe(true);
    expect(matchesArchiveFilter(null, "archived")).toBe(false);
    expect(matchesArchiveFilter(undefined, "archived")).toBe(false);
  });

  it("all: inclui todos", () => {
    expect(matchesArchiveFilter(null, "all")).toBe(true);
    expect(matchesArchiveFilter(archivedDate, "all")).toBe(true);
    expect(matchesArchiveFilter(undefined, "all")).toBe(true);
  });
});
