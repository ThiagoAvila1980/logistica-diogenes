import { describe, expect, it } from "vitest";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { getItemTransportGates } from "./transport-item-gates";

function item(
  id: string,
  overrides: Partial<MeasurementLineItem> = {},
): MeasurementLineItem {
  return {
    id,
    qty: 1,
    largura: 1000,
    altura: 1200,
    ...overrides,
  };
}

describe("getItemTransportGates", () => {
  it("libera perfil estrutural quando corte concluído, mesmo sem veículo", () => {
    const gates = getItemTransportGates(
      item("a", { cuttingProgress: { corte: true, embalagem: false, acessorios: false, vidros: false } }),
      "transporte_perfil",
      false,
    );
    expect(gates.perfilEstrutural.unlocked).toBe(true);
    expect(gates.perfilEstrutural.reason).toBe(
      "Selecione um veículo para iniciar a entrega do perfil estrutural",
    );
  });

  it("bloqueia perfil estrutural enquanto corte pendente na fase de corte", () => {
    const gates = getItemTransportGates(
      item("a", { cuttingProgress: { corte: false, embalagem: false, acessorios: false, vidros: false } }),
      "cortes",
      true,
    );
    expect(gates.perfilEstrutural.unlocked).toBe(false);
    expect(gates.perfilEstrutural.reason).toBe("Aguardando corte deste vão");
  });

  it("libera vidros na fase de transporte mesmo sem corte de vidros no vão", () => {
    const gates = getItemTransportGates(
      item("a", { cuttingProgress: { corte: true, embalagem: true, acessorios: true, vidros: false } }),
      "transporte_perfil",
      false,
    );
    expect(gates.vidros.unlocked).toBe(true);
    expect(gates.vidros.reason).toBeNull();
  });

  it("bloqueia vidros na fase de corte enquanto vidros do vão pendente", () => {
    const gates = getItemTransportGates(
      item("a", { cuttingProgress: { corte: true, embalagem: true, acessorios: true, vidros: false } }),
      "cortes",
      false,
    );
    expect(gates.vidros.unlocked).toBe(false);
    expect(gates.vidros.reason).toBe("Aguardando vidros deste vão");
  });
});
