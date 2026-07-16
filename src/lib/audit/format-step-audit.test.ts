import { describe, it, expect } from "vitest";
import {
  buildStepCompletionMetaMap,
  formatStepAuditLabel,
} from "./format-step-audit";

describe("buildStepCompletionMetaMap", () => {
  it("mantém só o evento mais recente por item+step", () => {
    const older = new Date("2026-07-01T10:00:00Z");
    const newer = new Date("2026-07-02T10:00:00Z");

    const map = buildStepCompletionMetaMap([
      {
        itemId: "vao-1",
        actorName: "Ana",
        createdAt: newer,
        payload: { step: "corte", done: true },
      },
      {
        itemId: "vao-1",
        actorName: "Bruno",
        createdAt: older,
        payload: { step: "corte", done: true },
      },
      {
        itemId: "vao-1",
        actorName: "Ana",
        createdAt: newer,
        payload: { step: "embalagem", done: true },
      },
    ]);

    expect(map["vao-1"]?.corte?.actorName).toBe("Ana");
    expect(map["vao-1"]?.corte?.completedAt).toEqual(newer);
    expect(map["vao-1"]?.embalagem?.actorName).toBe("Ana");
  });

  it("ignora linhas sem item, step ou ator", () => {
    const map = buildStepCompletionMetaMap([
      {
        itemId: null,
        actorName: "Ana",
        createdAt: new Date(),
        payload: { step: "corte" },
      },
      {
        itemId: "vao-1",
        actorName: null,
        createdAt: new Date(),
        payload: { step: "corte" },
      },
      {
        itemId: "vao-1",
        actorName: "Ana",
        createdAt: new Date(),
        payload: {},
      },
    ]);
    expect(map).toEqual({});
  });
});

describe("formatStepAuditLabel", () => {
  it("formata nome e data em pt-BR", () => {
    const label = formatStepAuditLabel({
      actorName: "Ana",
      completedAt: new Date("2026-07-16T15:30:00"),
    });
    expect(label).toMatch(/^Feito por Ana em /);
    expect(label).toContain("16");
  });
});
