import { describe, expect, it } from "vitest";
import { canDeleteMeasurement } from "./permissions";

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
