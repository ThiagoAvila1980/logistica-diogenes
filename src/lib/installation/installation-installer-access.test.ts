import { describe, expect, it } from "vitest";
import {
  collectInstallerIdsFromMeasurementItems,
  hasPendingInstallationWorkForInstaller,
  isInstallerResponsibleForOrder,
} from "./installation-installer-access";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

describe("installation-installer-access", () => {
  it("coleta instaladores únicos dos vãos", () => {
    const items = [
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

  it("exige designação por vão (sem fallback de responsável geral)", () => {
    expect(isInstallerResponsibleForOrder("u1", [])).toBe(false);
    expect(isInstallerResponsibleForOrder("u1", ["u2"])).toBe(false);
    expect(isInstallerResponsibleForOrder("u1", ["u1"])).toBe(true);
  });

  describe("hasPendingInstallationWorkForInstaller", () => {
    const done = {
      estrutural: true,
      vidros: true,
      acabamento: true,
      concluido: true,
    } as const;

    it("retorna false quando o instalador concluiu todos os vãos dele", () => {
      const items = [
        {
          id: "a",
          qty: 1,
          largura: 1,
          altura: 1,
          installationProgress: { ...done, installerId: "inst-a" },
        },
        {
          id: "b",
          qty: 1,
          largura: 1,
          altura: 1,
          installationProgress: {
            estrutural: false,
            vidros: false,
            acabamento: false,
            concluido: false,
            installerId: "inst-b",
          },
        },
      ] as MeasurementLineItem[];

      expect(
        hasPendingInstallationWorkForInstaller(items, "inst-a"),
      ).toBe(false);
      expect(
        hasPendingInstallationWorkForInstaller(items, "inst-b"),
      ).toBe(true);
    });

    it("sem vão designado ao instalador, não há pendência (sem fallback)", () => {
      const items = [
        {
          id: "a",
          qty: 1,
          largura: 1,
          altura: 1,
          installationProgress: {
            estrutural: false,
            vidros: false,
            acabamento: false,
            concluido: false,
          },
        },
      ] as MeasurementLineItem[];

      expect(hasPendingInstallationWorkForInstaller(items, "u1")).toBe(false);
    });
  });
});
