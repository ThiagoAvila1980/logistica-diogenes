import { redirect } from "next/navigation";
import { BarChart2 } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { KpisPanel } from "@/components/reports/kpis-panel";
import { getSession } from "@/lib/auth/session";
import { getKpiReportPayload } from "@/lib/data/kpis-report";

export default async function KpisReportPage() {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const payload = await getKpiReportPayload();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Indicadores Operacionais"
        description="Visão executiva dos indicadores do fluxo operacional — volume, ritmo e distribuição das ordens de serviço."
        icon={BarChart2}
      />
      <KpisPanel payload={payload} />
    </div>
  );
}
