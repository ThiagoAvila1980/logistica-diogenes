import { listKanbanOrders } from "@/lib/data/kanban";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { getSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const [orders, session] = await Promise.all([
    listKanbanOrders(),
    getSession(),
  ]);
  const canRevertStage = hasAnyRole(session?.roles ?? [], ["gerente", "admin"]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col -mx-4 -mt-4 -mb-4 px-2 pb-2 pt-2 md:mx-0 md:mt-0 md:mb-0 md:p-2 lg:p-3">
      <KanbanBoard initialData={orders} canRevertStage={canRevertStage} />
    </div>
  );
}
