import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ServiceJourneyReportPanel } from "@/components/reports/service-journey-report-panel";
import { getSession } from "@/lib/auth/session";
import { listServiceJourneyReportRows } from "@/lib/data/service-journey-report";

export default async function ServiceJourneyReportPage() {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const rows = await listServiceJourneyReportRows();
  const generatedAt = new Date().toISOString();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Jornada dos serviços"
        count={rows.length}
        description="Acompanhe em quais etapas cada serviço passou — da medição até a conclusão."
        icon={BarChart3}
      />
      <ServiceJourneyReportPanel rows={rows} generatedAt={generatedAt} />
    </div>
  );
}
