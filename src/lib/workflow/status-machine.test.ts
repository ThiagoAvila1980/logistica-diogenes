import { describe, it, expect } from "vitest";
import {
  canTransition,
  getNextLinearStatus,
  getPrimaryNextStatus,
  assertTransitionGuards,
  TransitionValidationError,
  type TransitionContext,
} from "./status-machine";

const cuttingDone = {
  corteFeito: true,
  embalagemFeita: true,
  acessoriosFeitos: true,
  vidrosFeitos: true,
};

const cuttingNone = {
  corteFeito: false,
  embalagemFeita: false,
  acessoriosFeitos: false,
  vidrosFeitos: false,
};

function ctx(overrides: Partial<TransitionContext> = {}): TransitionContext {
  return {
    hasFinalMeasurement: true,
    cuttingSteps: cuttingDone,
    installationComplete: true,
    ...overrides,
  };
}

describe("canTransition", () => {
  it("permite avançar para o próximo passo do pipeline", () => {
    expect(canTransition("medicao_orcamento", "medicao_final")).toBe(true);
    expect(canTransition("medicao_final", "cortes")).toBe(true);
    expect(canTransition("instalacao_vidros", "concluido")).toBe(true);
  });

  it("rejeita pular etapas", () => {
    expect(canTransition("medicao_final", "transporte_perfil")).toBe(false);
    expect(canTransition("medicao_orcamento", "concluido")).toBe(false);
  });

  it("rejeita transição para o mesmo status", () => {
    expect(canTransition("cortes", "cortes")).toBe(false);
  });

  it("não permite transições a partir de status concluído", () => {
    expect(canTransition("concluido", "instalacao_vidros")).toBe(false);
    expect(canTransition("concluido", "medicao_orcamento")).toBe(false);
  });
});

describe("getNextLinearStatus / getPrimaryNextStatus", () => {
  it("retorna o próximo passo", () => {
    expect(getNextLinearStatus("medicao_final")).toBe("cortes");
    expect(getPrimaryNextStatus("cortes")).toBe("embalagem");
  });

  it("retorna null no fim do pipeline", () => {
    expect(getNextLinearStatus("concluido")).toBeNull();
    expect(getPrimaryNextStatus("concluido")).toBeNull();
  });
});

describe("assertTransitionGuards", () => {
  it("aceita transição válida com contexto satisfeito", () => {
    expect(() =>
      assertTransitionGuards("medicao_orcamento", "medicao_final", ctx()),
    ).not.toThrow();
  });

  it("rejeita transição inválida no grafo", () => {
    expect(() =>
      assertTransitionGuards("medicao_final", "concluido", ctx()),
    ).toThrowError(TransitionValidationError);
  });

  it("exige medição final para liberar o corte", () => {
    try {
      assertTransitionGuards("medicao_final", "cortes", ctx({ hasFinalMeasurement: false }));
      throw new Error("deveria ter lançado");
    } catch (err) {
      expect(err).toBeInstanceOf(TransitionValidationError);
      expect((err as TransitionValidationError).code).toBe("MISSING_FINAL_MEASUREMENT");
    }
  });

  it("exige corte concluído antes da embalagem", () => {
    expect(() =>
      assertTransitionGuards("cortes", "embalagem", ctx({ cuttingSteps: cuttingNone })),
    ).toThrowError(/cortes antes da embalagem/i);
  });

  it("exige embalagem antes dos acessórios", () => {
    expect(() =>
      assertTransitionGuards(
        "embalagem",
        "acessorios_plano",
        ctx({ cuttingSteps: { ...cuttingNone, corteFeito: true } }),
      ),
    ).toThrowError(TransitionValidationError);
  });

  it("exige todas as etapas de corte antes do transporte", () => {
    expect(() =>
      assertTransitionGuards(
        "acessorios_plano",
        "transporte_perfil",
        ctx({ cuttingSteps: { ...cuttingDone, vidrosFeitos: false } }),
      ),
    ).toThrowError(TransitionValidationError);
  });

  it("exige instalação completa antes de concluir", () => {
    try {
      assertTransitionGuards("instalacao_vidros", "concluido", ctx({ installationComplete: false }));
      throw new Error("deveria ter lançado");
    } catch (err) {
      expect((err as TransitionValidationError).code).toBe("INSTALLATION_INCOMPLETE");
    }
  });
});
