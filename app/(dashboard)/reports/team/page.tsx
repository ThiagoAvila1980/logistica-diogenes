import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { TeamPanel } from "@/components/reports/team-panel";
import { getSession } from "@/lib/auth/session";
import { getTeamReport, parsePeriodParams } from "@/lib/data/team-report";

type SearchParams = Promise<{ from?: string; to?: string }>;

export default async function TeamReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const { from: fromParam, to: toParam } = await searchParams;
  const { from, to } = parsePeriodParams(fromParam, toParam);

  const data = await getTeamReport(from, to);

  return (
    <div className="space-y-4">
      <PageHeading
        title="Produtividade da Equipe"
        count={data.members.length}
        description="Pontuação por período — cada vão concluído gera pontos para o colaborador responsável."
        icon={Users}
      />
      <TeamPanel data={data} />
    </div>
  );
}
