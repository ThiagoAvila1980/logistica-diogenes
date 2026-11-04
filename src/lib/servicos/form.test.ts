import { describe, expect, it } from "vitest";
import { formatReais, parseReais, parseServicoForm } from "./form";

const base = {
  descricao: "Mola",
  valor: "50,00",
  tempo: "2,5 h",
  meta: "",
  bonus: "",
  escopo: "vao",
};

describe("parseReais", () => {
  it("aceita inteiro, vírgula e milhar", () => {
    expect(parseReais("50")).toBe("50.00");
    expect(parseReais("50,5")).toBe("50.50");
    expect(parseReais("1.234,56")).toBe("1234.56");
    expect(parseReais("25.00")).toBe("25.00");
  });

  it("rejeita vazio e texto", () => {
    expect(parseReais("")).toBeNull();
    expect(parseReais("abc")).toBeNull();
    expect(parseReais("-5")).toBeNull();
  });
});

describe("parseServicoForm", () => {
  it("grava serviço do vão com meta e bônus vazios", () => {
    const result = parseServicoForm(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      descricao: "Mola",
      valor: "50.00",
      tempo: "2,5 h",
      meta: null,
      bonus: null,
      escopo: "vao",
    });
  });

  it("grava bônus e escopo avulso", () => {
    const result = parseServicoForm({
      ...base,
      descricao: "Corrida + vidro",
      valor: "25",
      tempo: "",
      meta: "por peça",
      bonus: "5,00",
      escopo: "avulso",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.bonus).toBe("5.00");
    expect(result.data.escopo).toBe("avulso");
    expect(result.data.tempo).toBeNull();
  });

  it("exige descrição, valor e escopo", () => {
    expect(parseServicoForm({ ...base, descricao: " " }).ok).toBe(false);
    expect(parseServicoForm({ ...base, valor: "" }).ok).toBe(false);
    expect(parseServicoForm({ ...base, escopo: "dia" }).ok).toBe(false);
    expect(parseServicoForm({ ...base, bonus: "dez" }).ok).toBe(false);
  });
});

describe("formatReais", () => {
  it("formata em real", () => {
    expect(formatReais("50.00").replace(/\s/g, " ")).toBe("R$ 50,00");
    expect(formatReais(null)).toBe("");
  });
});
