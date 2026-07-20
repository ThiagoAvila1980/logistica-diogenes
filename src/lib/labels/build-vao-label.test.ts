import { describe, expect, it } from "vitest";
import { buildLabelContent } from "./build-vao-label";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

function makeItem(
  overrides: Partial<MeasurementLineItem> = {},
): MeasurementLineItem {
  return {
    id: "vao-1",
    vaoNumber: 2,
    qty: 1,
    largura: 2170,
    altura: 1484,
    idAmbiente: "amb-1",
    idTipoEnvidracamento: "env-1",
    ...overrides,
  } as MeasurementLineItem;
}

describe("buildLabelContent", () => {
  it("monta cabeçalho do cliente e corpo do vão", () => {
    const content = buildLabelContent({
      order: {
        number: "OS-9",
        budgetReference: "ORC-55",
        clientName: "Maria Silva",
        clientPhone: "11987654321",
        clientAddress: "Rua A, 10",
      },
      item: makeItem(),
      itemIndex: 0,
      lookups: {
        ambientes: [{ id: "amb-1", descricao: "ÁREA EXTERNA" }],
        tipoEnvidracamento: [{ id: "env-1", descricao: "Sacada Reiki" }],
        cores: [],
        tipoVidro: [],
      },
    });

    expect(content.clientName).toBe("Maria Silva");
    expect(content.budgetNumber).toBe("ORC-55");
    expect(content.clientPhone).toMatch(/11/);
    expect(content.clientAddress).toBe("Rua A, 10");
    expect(content.vaoNumber).toBe(2);
    expect(content.ambiente).toBe("ÁREA EXTERNA");
    expect(content.envidracamento).toBe("Sacada Reiki");
    expect(content.vaoSpec).toContain("ÁREA EXTERNA");
    expect(content.vaoDims).toContain("2170");
    expect(content.qrPayload).toBe("DIO:VAO:vao-1");
  });
});
