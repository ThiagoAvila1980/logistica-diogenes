import { describe, expect, it } from "vitest";
import { buildLabelZpl, type LabelContent } from "./build-label-zpl";
import { DEFAULT_LABEL_PROFILE } from "./label-profile";

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

describe("buildLabelZpl", () => {
  it("gera ZPL com cabeçalho do cliente, vão e QR", () => {
    const zpl = buildLabelZpl(sample, {
      ...DEFAULT_LABEL_PROFILE,
      language: "zpl",
    });

    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^XZ");
    expect(zpl).toContain("^PW800");
    expect(zpl).toContain("^LL1200");
    expect(zpl).toContain("Maria Silva");
    expect(zpl).toContain("ORC-1234");
    expect(zpl).toContain("Cliente:");
    expect(zpl).toContain("AREA EXTERNA");
    expect(zpl).toContain("Sacada Reiki");
    expect(zpl).toContain("DIO:VAO:item-abc-123");
    expect(zpl).toMatch(/\^BQ/);
  });

  it("usa perfil customizado para tamanho em dots", () => {
    const zpl = buildLabelZpl(sample, {
      ...DEFAULT_LABEL_PROFILE,
      language: "zpl",
      widthMm: 80,
      heightMm: 40,
    });
    expect(zpl).toContain("^PW640");
    expect(zpl).toContain("^LL320");
  });

  it("escapa circumflexo e til no texto ZPL", () => {
    const zpl = buildLabelZpl(
      {
        ...sample,
        clientName: "João ^ Silva~",
      },
      { ...DEFAULT_LABEL_PROFILE, language: "zpl" },
    );
    expect(zpl).not.toMatch(/\^FDJoão \^ /);
    expect(zpl).toContain("Joao");
  });
});
