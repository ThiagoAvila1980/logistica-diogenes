import type { KanbanOrderItem } from "./kanban-types";

export type {
  CuttingSteps,
  TransportKanbanSteps,
  InstallationKanbanSteps,
  KanbanOrderItem,
} from "./kanban-types";

export async function listKanbanOrders(): Promise<KanbanOrderItem[]> {
  const { listKanbanOrdersDb } = await import("./kanban-db");
  return listKanbanOrdersDb();
}
