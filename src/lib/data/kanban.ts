import type { OsStatus, MeasurementFlow } from "@/db/schema";
import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";

export type CuttingSteps = {
  corte: boolean;
  embalagem: boolean;
  acessorios: boolean;
};

export type KanbanOrderItem = {
  id: string;
  number: string;
  budgetReference: string | null;
  status: OsStatus;
  measurementFlow: MeasurementFlow;
  clientName: string;
  priority: "baixa" | "normal" | "alta" | "urgente";
  scheduledDate: Date | null;
  /** Momento em que a OS entrou no status atual (proxy para tempo na coluna) */
  updatedAt: Date;
  /** true quando o medidor já registrou itens de medição (items não vazio). */
  hasMeasurement: boolean;
  /** Presente quando a OS está no plano de corte */
  cuttingSteps: CuttingSteps | null;
};

export async function listKanbanOrders(): Promise<KanbanOrderItem[]> {
  if (useMockData()) {
    return mockRepository.listKanban();
  }

  const { listKanbanOrdersDb } = await import("./kanban-db");
  return listKanbanOrdersDb();
}
