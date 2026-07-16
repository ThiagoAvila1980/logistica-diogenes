import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { AuditAdminPanel } from "@/components/admin/audit-admin-panel";
import { getSession } from "@/lib/auth/session";
import { listAuditEvents, listActiveUsersForAuditFilter } from "@/lib/data/audit-events";

type SearchParams = Promise<{
  osNumber?: string;
  measurementId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

export default async function AdminAuditoriaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session?.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const from = params.from ? new Date(`${params.from}T00:00:00`) : null;
  const to = params.to ? new Date(`${params.to}T23:59:59.999`) : null;

  const filters = {
    osNumber: params.osNumber,
    measurementId: params.measurementId,
    actorId: params.actorId === "all" ? undefined : params.actorId,
    action: params.action === "all" ? undefined : params.action,
    from,
    to,
    page: isNaN(page) ? 1 : page,
    pageSize: 50,
  };

  const [data, users] = await Promise.all([
    listAuditEvents(filters),
    listActiveUsersForAuditFilter(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeading
        title="Auditoria"
        description="Histórico de ações e alterações realizadas no sistema."
        icon={History}
      />
      <AuditAdminPanel data={data} users={users} />
    </div>
  );
}
