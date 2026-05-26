import { listKanbanOrders } from "@/lib/data/kanban";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default async function DashboardPage() {
  const orders = await listKanbanOrders();

  return (
    <div className="flex h-full min-h-0 flex-col p-2 lg:p-3">
      <KanbanBoard initialData={orders} />
    </div>
  );
}
