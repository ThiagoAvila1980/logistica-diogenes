import { describe, it, expect } from "vitest";
import { mergeMeasurementItemsOnConflict } from "./merge-on-conflict";
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

describe("mergeMeasurementItemsOnConflict", () => {
  it("preserva itens que só existem no servidor (criados por outro dispositivo)", () => {
    const client = [item("a", { largura: 150 })];
    const server = [item("a", { largura: 100 }), item("b", { largura: 200 })];

    const result = mergeMeasurementItemsOnConflict(client, server);

    expect(result.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("o cliente vence quando o mesmo item foi editado nos dois lados", () => {
    const client = [item("a", { largura: 150 })];
    const server = [item("a", { largura: 999 })];

    const result = mergeMeasurementItemsOnConflict(client, server);

    expect(result).toHaveLength(1);
    expect(result[0].largura).toBe(150);
  });

  it("retorna só os itens do cliente quando o servidor não tem itens extras", () => {
    const client = [item("a"), item("b")];
    const server = [item("a"), item("b")];

    const result = mergeMeasurementItemsOnConflict(client, server);

    expect(result.map((i) => i.id).sort()).toEqual(["a", "b"]);
  });

  it("não duplica itens quando o cliente removeu um item que também existe no servidor com o mesmo id", () => {
    const client = [item("a")];
    const server = [item("a"), item("a")];

    const result = mergeMeasurementItemsOnConflict(client, server);

    expect(result.filter((i) => i.id === "a")).toHaveLength(1);
  });

  it("lida com listas vazias em ambos os lados", () => {
    expect(mergeMeasurementItemsOnConflict([], [])).toEqual([]);
  });
});
