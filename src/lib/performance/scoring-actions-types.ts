import type { WorkEventType } from "@/db/schema";

export type ScoringActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export const EVENT_TYPE_LABELS: Record<WorkEventType, string> = {
  corte_vao: "Corte de vão",
  transporte_vao: "Transporte de vão",
  instalacao_vao: "Instalação de vão",
  medicao: "Medição",
};
