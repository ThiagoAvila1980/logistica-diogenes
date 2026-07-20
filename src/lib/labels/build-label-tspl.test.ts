import { describe, expect, it } from "vitest";
import { buildLabelTspl } from "./build-label-tspl";
import { DEFAULT_LABEL_PROFILE } from "./label-profile";
import type { LabelContent } from "./build-label-zpl";

const sample: LabelContent = {
  clientName: "Maria Silva",
  budgetNumber: "ORC-1234",
  clientPhone: "(11)98765-4321",
  clientAddress: "Rua das Flores, 100",
  vaoNumber: 1,
  ambiente: "AREA EXTERNA",
  envidracamento: "Sacada Reiki",
  vaoSpec: "AREA EXTERNA - Sacada Reiki",
  vaoDims: "1 x 2170 x 1484 mm",
  qrPayload: "DIO:VAO:item-abc-123",
};

describe("buildLabelTspl", () => {
  it("gera TSPL com campos em duas linhas e vão em 3 linhas", () => {
    const tspl = buildLabelTspl(sample, DEFAULT_LABEL_PROFILE);
    expect(tspl).toContain("SIZE 100 mm, 150 mm");
    expect(tspl).toContain("GAP 2 mm, 0 mm");
    expect(tspl).toContain("DIRECTION 0");
    expect(tspl).toContain('"Cliente:"');
    expect(tspl).toContain("Maria Silva");
    expect(tspl).toContain("Vao 1");
    expect(tspl).toContain("AREA EXTERNA");
    expect(tspl).toContain("Sacada Reiki");
    expect(tspl).toContain("1 x 2170 x 1484 mm");
    expect(tspl).toContain("QRCODE");
    expect(tspl).toContain("PRINT 1,1");
  });

  it("mantém o QR dentro da altura da etiqueta", () => {
    const tspl = buildLabelTspl(sample, {
      ...DEFAULT_LABEL_PROFILE,
      heightMm: 80,
      gapMm: 2,
    });
    const match = tspl.match(/QRCODE \d+,(\d+),/);
    expect(match).toBeTruthy();
    const qrY = Number(match?.[1]);
    expect(qrY).toBeLessThan(640);
  });
});
