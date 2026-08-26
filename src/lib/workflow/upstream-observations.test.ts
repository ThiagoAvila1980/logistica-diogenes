import { describe, expect, it } from "vitest";
import {
  collectOsUpstreamObservations,
  collectVaoUpstreamObservations,
} from "./upstream-observations";

describe("collectOsUpstreamObservations", () => {
  it("no corte, devolve só a observação do medidor", () => {
    expect(
      collectOsUpstreamObservations({
        stage: "cutting",
        measurementNotes: "Cuidado com o piso",
        cutterNotes: "Vidros frágeis",
      }),
    ).toEqual([
      { source: "medidor", label: "Observação do Medidor", text: "Cuidado com o piso" },
    ]);
  });

  it("no transporte, devolve observação do medidor e do cortador", () => {
    expect(
      collectOsUpstreamObservations({
        stage: "transport",
        measurementNotes: "Piso irregular",
        cutterNotes: "Embalar com cuidado",
      }),
    ).toEqual([
      { source: "medidor", label: "Observação do Medidor", text: "Piso irregular" },
      { source: "cortador", label: "Observação do Cortador", text: "Embalar com cuidado" },
    ]);
  });

  it("na instalação, devolve observação do medidor e do cortador", () => {
    expect(
      collectOsUpstreamObservations({
        stage: "installation",
        measurementNotes: "Piso irregular",
        cutterNotes: "Embalar com cuidado",
      }),
    ).toEqual([
      { source: "medidor", label: "Observação do Medidor", text: "Piso irregular" },
      { source: "cortador", label: "Observação do Cortador", text: "Embalar com cuidado" },
    ]);
  });

  it("omite notas vazias ou só com espaço", () => {
    expect(
      collectOsUpstreamObservations({
        stage: "transport",
        measurementNotes: "   ",
        cutterNotes: null,
      }),
    ).toEqual([]);
  });
});

describe("collectVaoUpstreamObservations", () => {
  it("no corte e no transporte, devolve a observação do medidor do vão", () => {
    expect(
      collectVaoUpstreamObservations({
        stage: "cutting",
        itemObservacao: "Vão com desnível",
        driverObservacoes: "Deixei na garagem",
      }),
    ).toEqual([
      { source: "medidor", label: "Observação do Medidor", text: "Vão com desnível" },
    ]);

    expect(
      collectVaoUpstreamObservations({
        stage: "transport",
        itemObservacao: "Vão com desnível",
        driverObservacoes: "Deixei na garagem",
      }),
    ).toEqual([
      { source: "medidor", label: "Observação do Medidor", text: "Vão com desnível" },
    ]);
  });

  it("na instalação, devolve observação do medidor e do motorista", () => {
    expect(
      collectVaoUpstreamObservations({
        stage: "installation",
        itemObservacao: "Vão com desnível",
        driverObservacoes: "Deixei na garagem",
      }),
    ).toEqual([
      { source: "medidor", label: "Observação do Medidor", text: "Vão com desnível" },
      { source: "motorista", label: "Observação do Motorista", text: "Deixei na garagem" },
    ]);
  });

  it("omite notas de vão vazias", () => {
    expect(
      collectVaoUpstreamObservations({
        stage: "installation",
        itemObservacao: "",
        driverObservacoes: "  ",
      }),
    ).toEqual([]);
  });
});
