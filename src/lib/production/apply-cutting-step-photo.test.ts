import { describe, expect, it } from "vitest";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { applyCuttingStepPhoto } from "./apply-cutting-step-photo";

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

describe("applyCuttingStepPhoto", () => {
  it("marca a etapa como concluída e grava a URL da foto", () => {
    const next = applyCuttingStepPhoto(
      makeItem(),
      "corte",
      "/uploads/measurements/os-1/foto.webp",
    );

    expect(next.cuttingProgress).toEqual({
      corte: true,
      embalagem: false,
      acessorios: false,
      vidros: false,
    });
    expect(next.cuttingStepPhotos).toEqual({
      corte: "/uploads/measurements/os-1/foto.webp",
    });
  });

  it("preserva etapas e fotos já concluídas de outros passos", () => {
    const item = makeItem({
      cuttingProgress: {
        corte: true,
        embalagem: true,
        acessorios: false,
        vidros: false,
      },
      cuttingStepPhotos: {
        corte: "/uploads/corte.webp",
        embalagem: "/uploads/embalagem.webp",
      },
    });

    const next = applyCuttingStepPhoto(
      item,
      "vidros",
      "/uploads/vidros.webp",
    );

    expect(next.cuttingProgress).toEqual({
      corte: true,
      embalagem: true,
      acessorios: false,
      vidros: true,
    });
    expect(next.cuttingStepPhotos).toEqual({
      corte: "/uploads/corte.webp",
      embalagem: "/uploads/embalagem.webp",
      vidros: "/uploads/vidros.webp",
    });
  });
});
