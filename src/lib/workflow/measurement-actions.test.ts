import { describe, expect, it } from "vitest";
import {
  getAllowedMeasurementActions,
  isMeasurementActionAllowed,
} from "./measurement-actions";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

function item(
  id: string,
  overrides: Partial<MeasurementLineItem> = {},
): MeasurementLineItem {
  return { id, qty: 1, largura: 100, altura: 100, ...overrides };
}

describe("getAllowedMeasurementActions", () => {
  it("libera orçamento e final na fase de medição", () => {
    expect(
      getAllowedMeasurementActions({ etapa: "medicao_final" }),
    ).toEqual(["orcamento", "final"]);
  });

  it("bloqueia medição quando a OS avançou e não há vãos remanescentes", () => {
    expect(
      getAllowedMeasurementActions({
        etapa: "cortes",
        items: [
          item("a", { sentToCutting: true }),
          item("b", { sentToCutting: true }),
        ],
      }),
    ).toEqual([]);
  });

  it("libera só medição final quando há vãos ainda não enviados ao corte", () => {
    const items = [
      item("a", { sentToCutting: true }),
      item("b", { sentToCutting: false }),
    ];
    expect(
      getAllowedMeasurementActions({ etapa: "transporte_perfil", items }),
    ).toEqual(["final"]);
    expect(
      isMeasurementActionAllowed(
        { etapa: "transporte_perfil", items },
        "final",
      ),
    ).toBe(true);
  });

  it("com addVaosAfterCutting libera só final mesmo sem remanescentes", () => {
    expect(
      getAllowedMeasurementActions(
        {
          etapa: "cortes",
          items: [item("a", { sentToCutting: true })],
        },
        { addVaosAfterCutting: true },
      ),
    ).toEqual(["final"]);
  });

  it("sem flag e sem remanescentes continua vazio fora da medição", () => {
    expect(
      getAllowedMeasurementActions({
        etapa: "cortes",
        items: [item("a", { sentToCutting: true })],
      }),
    ).toEqual([]);
  });
});
