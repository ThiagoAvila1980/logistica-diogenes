import { listKanbanOrders } from "@/lib/data/kanban";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export default async function DashboardPage() {
  const orders = await listKanbanOrders();

  return (
    <div className="flex h-full min-h-0 flex-col -mx-4 -mt-4 -mb-4 px-2 pb-2 pt-2 md:mx-0 md:mt-0 md:mb-0 md:p-2 lg:p-3">
      <KanbanBoard initialData={orders} />
    </div>
  );
}
