import { useMockData } from "./config";
import { mockRepository } from "./mock-repository";
import type { KanbanOrderItem } from "./kanban-types";

export type {
  CuttingSteps,
  TransportKanbanSteps,
  InstallationKanbanSteps,
  KanbanOrderItem,
} from "./kanban-types";

export async function listKanbanOrders(): Promise<KanbanOrderItem[]> {
  if (useMockData()) {
    return mockRepository.listKanban();
  }

  const { listKanbanOrdersDb } = await import("./kanban-db");
  return listKanbanOrdersDb();
}
