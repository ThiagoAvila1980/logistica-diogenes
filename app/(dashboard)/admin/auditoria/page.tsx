import { Suspense } from "react";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { AuditAdminPanel } from "@/components/admin/audit-admin-panel";
import { getSession } from "@/lib/auth/session";
import { listAuditEvents, listActiveUsersForAuditFilter } from "@/lib/data/audit-events";
import { parseAuditListSearchParams } from "@/lib/audit/audit-list-filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  os?: string;
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
  const filters = parseAuditListSearchParams(params);

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
      <Suspense fallback={null}>
        <AuditAdminPanel data={data} users={users} />
      </Suspense>
    </div>
  );
}
