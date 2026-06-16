import { describe, expect, it } from "vitest";
import {
  collectInstallerIdsFromMeasurementItems,
  isInstallerResponsibleForOrder,
} from "./installation-installer-access";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

describe("installation-installer-access", () => {
  it("coleta instaladores únicos dos vãos", () => {    const items = [
      {
        id: "a",
        qty: 1,
        largura: 1,
        altura: 1,
        installationProgress: { installerId: "i1" },
      },
      {
        id: "b",
        qty: 1,
        largura: 1,
        altura: 1,
        installationProgress: { installerId: "i2" },
      },
      {
        id: "c",
        qty: 1,
        largura: 1,
        altura: 1,
        installationProgress: { installerId: "i1" },
      },
    ] as MeasurementLineItem[];

    expect(collectInstallerIdsFromMeasurementItems(items)).toEqual(["i1", "i2"]);
  });

  it("aceita responsável geral legado sem designação por vão", () => {
    expect(
      isInstallerResponsibleForOrder("u1", [], "u1"),
    ).toBe(true);
  });

  it("ignora responsável geral quando há designação por vão", () => {
    expect(
      isInstallerResponsibleForOrder("u1", ["u2"], "u1"),
    ).toBe(false);
  });
});