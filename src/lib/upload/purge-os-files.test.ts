import { describe, expect, it } from "vitest";
import { collectMeasurementFileUrls } from "./purge-os-files";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

describe("collectMeasurementFileUrls", () => {
  it("inclui fotos das etapas de corte do vão", () => {
    const item: MeasurementLineItem = {
      id: "vao-1",
      qty: 1,
      largura: 1000,
      altura: 2100,
      cuttingStepPhotos: {
        corte: "/uploads/measurements/os-1/corte.webp",
        embalagem: "/uploads/measurements/os-1/embalagem.webp",
      },
    };

    const urls = collectMeasurementFileUrls({ items: [item] });

    expect(urls).toEqual(
      expect.arrayContaining([
        "/uploads/measurements/os-1/corte.webp",
        "/uploads/measurements/os-1/embalagem.webp",
      ]),
    );
  });
});
