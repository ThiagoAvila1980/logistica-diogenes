import { describe, expect, it } from "vitest";
import {
  canArchiveMeasurement,
  canDeleteMeasurement,
  canAddVaosAfterCutting,
  canAssignTransport,
  getNavItemsForRoles,
  isNavItemActive,
} from "./permissions";

describe("canArchiveMeasurement", () => {
  it("permite somente admin", () => {
    expect(canArchiveMeasurement(["admin"])).toBe(true);
    expect(canArchiveMeasurement(["admin", "gerente"])).toBe(true);
  });

  it("nega gerente e demais papéis", () => {
    expect(canArchiveMeasurement(["gerente"])).toBe(false);
    expect(canArchiveMeasurement(["medidor"])).toBe(false);
    expect(canArchiveMeasurement(["cortador", "motorista", "instalador"])).toBe(
      false,
    );
    expect(canArchiveMeasurement([])).toBe(false);
  });
});

describe("canDeleteMeasurement", () => {
  it("permite somente admin", () => {
    expect(canDeleteMeasurement(["admin"])).toBe(true);
    expect(canDeleteMeasurement(["admin", "gerente"])).toBe(true);
  });

  it("nega gerente e demais papéis", () => {
    expect(canDeleteMeasurement(["gerente"])).toBe(false);
    expect(canDeleteMeasurement(["medidor"])).toBe(false);
    expect(canDeleteMeasurement(["cortador", "motorista", "instalador"])).toBe(
      false,
    );
    expect(canDeleteMeasurement([])).toBe(false);
  });
});

describe("canAddVaosAfterCutting", () => {
  it("permite somente admin", () => {
    expect(canAddVaosAfterCutting(["admin"])).toBe(true);
    expect(canAddVaosAfterCutting(["admin", "gerente"])).toBe(true);
  });

  it("nega gerente e demais papéis", () => {
    expect(canAddVaosAfterCutting(["gerente"])).toBe(false);
    expect(canAddVaosAfterCutting(["medidor"])).toBe(false);
    expect(canAddVaosAfterCutting(["cortador", "motorista", "instalador"])).toBe(
      false,
    );
    expect(canAddVaosAfterCutting([])).toBe(false);
  });
});

describe("canAssignTransport", () => {
  it("permite admin e gerente (motorista, data e veículo)", () => {
    expect(canAssignTransport(["admin"])).toBe(true);
    expect(canAssignTransport(["gerente"])).toBe(true);
    expect(canAssignTransport(["admin", "gerente"])).toBe(true);
  });

  it("nega motorista e demais papéis", () => {
    expect(canAssignTransport(["motorista"])).toBe(false);
    expect(canAssignTransport(["medidor"])).toBe(false);
    expect(canAssignTransport(["cortador"])).toBe(false);
    expect(canAssignTransport(["instalador"])).toBe(false);
    expect(canAssignTransport([])).toBe(false);
  });
});

describe("isNavItemActive", () => {
  const items = [
    { match: "/installation" },
    { match: "/installation/agenda" },
    { match: "/concluded" },
  ];

  it("marca Agenda só em /installation/agenda", () => {
    expect(
      isNavItemActive("/installation/agenda", { match: "/installation/agenda" }, items),
    ).toBe(true);
    expect(
      isNavItemActive("/installation", { match: "/installation/agenda" }, items),
    ).toBe(false);
    expect(
      isNavItemActive("/installation/abc", { match: "/installation/agenda" }, items),
    ).toBe(false);
  });

  it("marca Instalação na listagem e na OS, não na agenda", () => {
    expect(
      isNavItemActive("/installation", { match: "/installation" }, items),
    ).toBe(true);
    expect(
      isNavItemActive("/installation/abc", { match: "/installation" }, items),
    ).toBe(true);
    expect(
      isNavItemActive("/installation/agenda", { match: "/installation" }, items),
    ).toBe(false);
  });
});

describe("getNavItemsForRoles", () => {
  it("inclui Agenda para quem acessa Instalação", () => {
    const hrefs = getNavItemsForRoles(["instalador"]).map((item) => item.href);
    expect(hrefs).toContain("/installation");
    expect(hrefs).toContain("/installation/agenda");
    expect(hrefs).toContain("/concluded");
  });

  it("não inclui Agenda para medidor", () => {
    expect(getNavItemsForRoles(["medidor"]).map((item) => item.href)).not.toContain(
      "/installation/agenda",
    );
  });
});
