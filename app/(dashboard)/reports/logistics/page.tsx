import { redirect } from "next/navigation";
import { Truck } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { LogisticsPanel } from "@/components/reports/logistics-panel";
import { getSession } from "@/lib/auth/session";
import { getLogisticsReportPayload } from "@/lib/data/logistics-report";

export default async function LogisticsReportPage() {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const payload = await getLogisticsReportPayload();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Desempenho Logístico"
        description="Visão da frota e motoristas — entregas realizadas, sub-etapas concluídas e OS aguardando transporte."
        icon={Truck}
      />
      <LogisticsPanel payload={payload} />
    </div>
  );
}
