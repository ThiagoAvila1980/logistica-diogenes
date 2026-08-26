import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  UpstreamObservationsCard,
  VaoUpstreamObservations,
} from "./upstream-observations";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

describe("UpstreamObservationsCard", () => {
  it("mostra observação do medidor e do cortador com os rótulos", () => {
    const markup = renderToStaticMarkup(
      React.createElement(UpstreamObservationsCard, {
        observations: [
          {
            source: "medidor",
            label: "Observação do Medidor",
            text: "Piso irregular",
          },
          {
            source: "cortador",
            label: "Observação do Cortador",
            text: "Embalar com cuidado",
          },
        ],
      }),
    );

    expect(markup).toContain("Observação do Medidor");
    expect(markup).toContain("Piso irregular");
    expect(markup).toContain("Observação do Cortador");
    expect(markup).toContain("Embalar com cuidado");
  });
});

describe("VaoUpstreamObservations", () => {
  it("mostra observação do motorista no vão da instalação", () => {
    const markup = renderToStaticMarkup(
      React.createElement(VaoUpstreamObservations, {
        observations: [
          {
            source: "motorista",
            label: "Observação do Motorista",
            text: "Deixei na garagem",
          },
        ],
      }),
    );

    expect(markup).toContain("Observação do Motorista");
    expect(markup).toContain("Deixei na garagem");
  });

  it("não renderiza nada sem observações", () => {
    const markup = renderToStaticMarkup(
      React.createElement(VaoUpstreamObservations, { observations: [] }),
    );
    expect(markup).toBe("");
  });
});
