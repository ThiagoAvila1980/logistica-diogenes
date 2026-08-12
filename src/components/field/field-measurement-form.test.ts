import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { OrderDetail } from "@/lib/data/types";
import type { MeasurementLookups } from "@/lib/data/lookup-types";
import { FieldMeasurementForm } from "./field-measurement-form";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const order = {
  id: "os-123",
  number: "OS-123",
  status: "cortes",
  type: "final",
  measurementStatus: "completed",
  priority: "normal",
  clientName: "Cliente Teste",
  clientPhone: null,
  clientAddress: null,
  description: null,
  budgetReference: null,
} as OrderDetail;

const lookups = {
  cores: [],
  tipoVidro: [],
  tipoEnvidracamento: [],
  ambientes: [],
} satisfies MeasurementLookups;

describe("FieldMeasurementForm no modo add-vaos", () => {
  it("inicia vazio e editável, exibindo o aviso do fluxo", () => {
    const markup = renderToStaticMarkup(
      React.createElement(FieldMeasurementForm, {
        order,
        draftsByType: {},
        lookups,
        allMeasurementItems: [],
        addVaosMode: true,
      }),
    );

    expect(markup).toContain(
      "Adicionando vãos a uma OS já em plano de corte.",
    );
    expect(markup).toContain("Nova medição");
    expect(markup).toContain("Salvar Medição");
    expect(markup).not.toContain("Vão 1");
  });
});
