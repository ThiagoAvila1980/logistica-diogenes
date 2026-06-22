import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { BacklogPanel } from "@/components/reports/backlog-panel";
import { getSession } from "@/lib/auth/session";
import { getBacklogSummary } from "@/lib/data/backlog-report";

export default async function BacklogReportPage() {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const data = await getBacklogSummary();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Pendências e Prazos"
        count={data.rows.length}
        description="Monitore OS paradas, gargalos no fluxo operacional e conformidade com prazos por prioridade."
        icon={Clock}
      />
      <BacklogPanel data={data} />
    </div>
  );
}
