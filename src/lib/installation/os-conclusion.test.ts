import { describe, expect, it } from "vitest";
import {
  osCloseOnVaoConfirmed,
  osReopenOnVaoUnchecked,
} from "./os-conclusion";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";

function vao(id: string, concluido: boolean): MeasurementLineItem {
  return {
    id,
    qty: 1,
    largura: 1000,
    altura: 1000,
    installationProgress: {
      estrutural: true,
      vidros: true,
      acabamento: true,
      concluido,
    },
  };
}

const now = new Date("2026-10-08T13:49:00.000Z");

describe("osCloseOnVaoConfirmed", () => {
  it("grava o fechamento quando o último vão é confirmado", () => {
    expect(
      osCloseOnVaoConfirmed({
        etapa: "transporte_perfil",
        items: [vao("a", true), vao("b", true)],
        now,
      }),
    ).toEqual({ fromStatus: "transporte_perfil", concludedAt: now });
  });

  it("não fecha enquanto ainda há vão pendente", () => {
    expect(
      osCloseOnVaoConfirmed({
        etapa: "transporte_perfil",
        items: [vao("a", true), vao("b", false)],
        now,
      }),
    ).toBeNull();
  });

  it("não gera outro fechamento se a OS já está concluída", () => {
    expect(
      osCloseOnVaoConfirmed({
        etapa: "concluido",
        items: [vao("a", true)],
        now,
      }),
    ).toBeNull();
  });
});

describe("osReopenOnVaoUnchecked", () => {
  it("devolve a etapa anterior quando um vão é reaberto", () => {
    expect(
      osReopenOnVaoUnchecked({
        etapa: "concluido",
        items: [vao("a", false)],
        restoreStatus: "transporte_perfil",
      }),
    ).toBe("transporte_perfil");
  });

  it("mantém a OS concluída se todos os vãos seguem confirmados", () => {
    expect(
      osReopenOnVaoUnchecked({
        etapa: "concluido",
        items: [vao("a", true)],
        restoreStatus: "transporte_perfil",
      }),
    ).toBeNull();
  });
});
