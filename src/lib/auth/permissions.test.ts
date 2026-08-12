import { describe, expect, it } from "vitest";
import {
  canArchiveMeasurement,
  canDeleteMeasurement,
  canAddVaosAfterCutting,
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
