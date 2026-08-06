import { describe, expect, it } from "vitest";
import { mergePreservingSentToCutting } from "./merge-preserving-sent-to-cutting";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

function item(
  id: string,
  overrides: Partial<MeasurementLineItem> = {},
): MeasurementLineItem {
  return {
    id,
    qty: 1,
    largura: 100,
    altura: 100,
    ...overrides,
  };
}

describe("mergePreservingSentToCutting", () => {
  it("sem envio ao corte, usa os itens do cliente", () => {
    const client = [item("a", { largura: 200 }), item("b")];
    const server = [item("a", { largura: 100 })];
    expect(mergePreservingSentToCutting(client, server)).toEqual(client);
  });

  it("preserva vãos enviados ao corte e aplica só os remanescentes do cliente", () => {
    const server = [
      item("a", {
        sentToCutting: true,
        cuttingProgress: {
          corte: true,
          embalagem: false,
          acessorios: false,
          vidros: false,
        },
      }),
      item("b", { sentToCutting: false, largura: 80 }),
      item("c", { sentToCutting: false }),
    ];
    const client = [
      item("b", { sentToCutting: false, largura: 120 }),
      item("d", { largura: 50 }),
    ];

    const result = mergePreservingSentToCutting(client, server);
    expect(result.map((i) => i.id)).toEqual(["a", "b", "d"]);
    expect(result[0]?.cuttingProgress?.corte).toBe(true);
    expect(result[1]?.largura).toBe(120);
    expect(result.find((i) => i.id === "c")).toBeUndefined();
  });

  it("ignora tentativa do cliente de alterar vão já enviado", () => {
    const server = [
      item("a", {
        sentToCutting: true,
        largura: 100,
        cuttingProgress: {
          corte: true,
          embalagem: true,
          acessorios: false,
          vidros: false,
        },
      }),
    ];
    const client = [
      item("a", {
        sentToCutting: false,
        largura: 999,
        cuttingProgress: {
          corte: false,
          embalagem: false,
          acessorios: false,
          vidros: false,
        },
      }),
      item("b"),
    ];

    const result = mergePreservingSentToCutting(client, server);
    expect(result).toHaveLength(2);
    expect(result[0]?.largura).toBe(100);
    expect(result[0]?.sentToCutting).toBe(true);
    expect(result[0]?.cuttingProgress?.corte).toBe(true);
  });
});
