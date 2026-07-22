import { describe, expect, it } from "vitest";
import {
  buildInternalRoute,
  isValidInternalPath,
  parseGotoParam,
  shouldMaskBrowserUrl,
} from "./masked-url";

describe("isValidInternalPath", () => {
  it("aceita rotas internas com query string de filtros", () => {
    expect(
      isValidInternalPath(
        "/admin/auditoria?actorId=u1&action=cutting.step_checked&from=2026-07-01",
      ),
    ).toBe(true);
    expect(isValidInternalPath("/field?os=123")).toBe(true);
  });

  it("rejeita URLs externas mesmo com query", () => {
    expect(isValidInternalPath("https://evil.example/admin")).toBe(false);
    expect(isValidInternalPath("//evil.example")).toBe(false);
  });
});

describe("buildInternalRoute", () => {
  it("combina pathname e search sem duplicar ?", () => {
    expect(buildInternalRoute("/admin/auditoria", "")).toBe("/admin/auditoria");
    expect(buildInternalRoute("/admin/auditoria", "actorId=u1")).toBe(
      "/admin/auditoria?actorId=u1",
    );
    expect(buildInternalRoute("/admin/auditoria", "?action=os.stage_changed")).toBe(
      "/admin/auditoria?action=os.stage_changed",
    );
  });
});

describe("parseGotoParam", () => {
  it("preserva query string no goto", () => {
    const goto = encodeURIComponent("/admin/auditoria?actorId=u1&from=2026-07-22");
    expect(parseGotoParam(`?goto=${goto}`)).toBe(
      "/admin/auditoria?actorId=u1&from=2026-07-22",
    );
  });
});

describe("shouldMaskBrowserUrl", () => {
  it("não mascara quando há filtros na query (evita GET /?actorId=)", () => {
    expect(shouldMaskBrowserUrl("actorId=u1&page=1")).toBe(false);
    expect(shouldMaskBrowserUrl("action=cutting.step_checked")).toBe(false);
  });

  it("mascara quando não há query", () => {
    expect(shouldMaskBrowserUrl("")).toBe(true);
    expect(shouldMaskBrowserUrl("   ")).toBe(true);
  });
});
