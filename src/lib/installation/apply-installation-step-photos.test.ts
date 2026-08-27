import { describe, expect, it } from "vitest";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { applyInstallationStepPhotos } from "./apply-installation-step-photos";

function makeItem(
  overrides: Partial<MeasurementLineItem> = {},
): MeasurementLineItem {
  return {
    id: "vao-1",
    qty: 1,
    largura: 1000,
    altura: 2100,
    ...overrides,
  };
}

describe("applyInstallationStepPhotos", () => {
  it("marca a etapa e grava uma foto", () => {
    const next = applyInstallationStepPhotos(makeItem(), "estrutural", [
      "/uploads/installation/os-1/a.webp",
    ]);

    expect(next.installationProgress).toMatchObject({
      estrutural: true,
      vidros: false,
      acabamento: false,
    });
    expect(next.installationStepPhotos).toEqual({
      estrutural: ["/uploads/installation/os-1/a.webp"],
    });
  });

  it("aceita várias fotos na mesma etapa", () => {
    const next = applyInstallationStepPhotos(makeItem(), "vidros", [
      "/uploads/installation/os-1/a.webp",
      "/uploads/installation/os-1/b.webp",
    ]);

    expect(next.installationProgress?.vidros).toBe(true);
    expect(next.installationStepPhotos?.vidros).toEqual([
      "/uploads/installation/os-1/a.webp",
      "/uploads/installation/os-1/b.webp",
    ]);
  });

  it("preserva etapas e fotos já concluídas de outros passos", () => {
    const item = makeItem({
      installationProgress: {
        estrutural: true,
        vidros: false,
        acabamento: false,
      },
      installationStepPhotos: {
        estrutural: ["/uploads/installation/os-1/est.webp"],
      },
    });

    const next = applyInstallationStepPhotos(item, "acabamento", [
      "/uploads/installation/os-1/ac1.webp",
      "/uploads/installation/os-1/ac2.webp",
    ]);

    expect(next.installationProgress).toMatchObject({
      estrutural: true,
      vidros: false,
      acabamento: true,
    });
    expect(next.installationStepPhotos).toEqual({
      estrutural: ["/uploads/installation/os-1/est.webp"],
      acabamento: [
        "/uploads/installation/os-1/ac1.webp",
        "/uploads/installation/os-1/ac2.webp",
      ],
    });
  });

  it("exige ao menos uma foto para concluir a etapa", () => {
    expect(() =>
      applyInstallationStepPhotos(makeItem(), "estrutural", []),
    ).toThrow(/ao menos uma foto/i);
  });
});
