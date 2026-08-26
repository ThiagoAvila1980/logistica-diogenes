export type WorkflowObservationStage = "cutting" | "transport" | "installation";

export type ObservationSource = "medidor" | "cortador" | "motorista";

export const OBSERVATION_LABELS: Record<ObservationSource, string> = {
  medidor: "Observação do Medidor",
  cortador: "Observação do Cortador",
  motorista: "Observação do Motorista",
};

export type UpstreamObservation = {
  source: ObservationSource;
  label: string;
  text: string;
};

function trimNote(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function note(
  source: ObservationSource,
  value: string | null | undefined,
): UpstreamObservation | null {
  const text = trimNote(value);
  if (!text) return null;
  return { source, label: OBSERVATION_LABELS[source], text };
}

/** Observações de OS que a etapa atual deve ler das etapas anteriores. */
export function collectOsUpstreamObservations(params: {
  stage: WorkflowObservationStage;
  measurementNotes: string | null | undefined;
  cutterNotes: string | null | undefined;
}): UpstreamObservation[] {
  const medidor = note("medidor", params.measurementNotes);
  const cortador = note("cortador", params.cutterNotes);

  if (params.stage === "cutting") {
    return medidor ? [medidor] : [];
  }

  return [medidor, cortador].filter(
    (item): item is UpstreamObservation => item !== null,
  );
}

/** Observações por vão que a etapa atual deve ler das etapas anteriores. */
export function collectVaoUpstreamObservations(params: {
  stage: WorkflowObservationStage;
  itemObservacao: string | null | undefined;
  driverObservacoes: string | null | undefined;
}): UpstreamObservation[] {
  const medidor = note("medidor", params.itemObservacao);
  const motorista = note("motorista", params.driverObservacoes);

  if (params.stage === "installation") {
    return [medidor, motorista].filter(
      (item): item is UpstreamObservation => item !== null,
    );
  }

  return medidor ? [medidor] : [];
}
