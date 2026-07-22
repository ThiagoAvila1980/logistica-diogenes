import { describe, expect, it } from "vitest";
import {
  buildAuditOsSearchPattern,
  matchesAuditOsSearch,
  parseAuditListSearchParams,
} from "./audit-list-filters";

describe("parseAuditListSearchParams", () => {
  it("ignora valores vazios e 'all'", () => {
    expect(
      parseAuditListSearchParams({
        os: "  ",
        actorId: "all",
        action: "all",
        from: "",
        to: "",
        page: "0",
      }),
    ).toEqual({
      osNumber: undefined,
      measurementId: undefined,
      actorId: undefined,
      action: undefined,
      from: null,
      to: null,
      page: 1,
      pageSize: 50,
    });
  });

  it("interpreta datas yyyy-MM-dd no início/fim do dia local", () => {
    const parsed = parseAuditListSearchParams({
      from: "2026-07-22",
      to: "2026-07-22",
      actorId: "user-1",
      action: "cutting.step_checked",
      os: " 123/2026 ",
      page: "2",
    });

    expect(parsed.osNumber).toBe("123/2026");
    expect(parsed.actorId).toBe("user-1");
    expect(parsed.action).toBe("cutting.step_checked");
    expect(parsed.page).toBe(2);
    expect(parsed.from?.getFullYear()).toBe(2026);
    expect(parsed.from?.getMonth()).toBe(6);
    expect(parsed.from?.getDate()).toBe(22);
    expect(parsed.from?.getHours()).toBe(0);
    expect(parsed.from?.getMinutes()).toBe(0);
    expect(parsed.to?.getHours()).toBe(23);
    expect(parsed.to?.getMinutes()).toBe(59);
    expect(parsed.to?.getSeconds()).toBe(59);
  });

  it("descarta datas inválidas em vez de gerar Invalid Date", () => {
    const parsed = parseAuditListSearchParams({
      from: "2026-13-99",
      to: "nao-e-data",
    });
    expect(parsed.from).toBeNull();
    expect(parsed.to).toBeNull();
  });
});

describe("matchesAuditOsSearch", () => {
  it("casa número interno, orçamento e referência", () => {
    const order = {
      number: "OS-9",
      numeroOrcamento: "123/2026",
      budgetReference: "ORC-55",
    };
    expect(matchesAuditOsSearch(order, "123")).toBe(true);
    expect(matchesAuditOsSearch(order, "orc-55")).toBe(true);
    expect(matchesAuditOsSearch(order, "os-9")).toBe(true);
    expect(matchesAuditOsSearch(order, "zzz")).toBe(false);
  });
});

describe("buildAuditOsSearchPattern", () => {
  it("escapa curingas do LIKE", () => {
    expect(buildAuditOsSearchPattern("12%_3")).toBe("%12\\%\\_3%");
  });
});
