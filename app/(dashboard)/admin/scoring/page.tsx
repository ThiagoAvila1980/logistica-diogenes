import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ScoringAdminPanel } from "@/components/admin/scoring-admin-panel";
import { getScoringRules } from "@/actions/scoring-actions";
import { getSession } from "@/lib/auth/session";

export default async function AdminScoringPage() {
  const session = await getSession();
  if (!session?.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const rules = await getScoringRules();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Pontuação por desempenho"
        description="Configure quantos pontos cada tipo de conclusão vale. Os pontos são creditados no momento da conclusão e não mudam retroativamente."
        icon={Trophy}
      />
      <ScoringAdminPanel rules={rules} />
    </div>
  );
}
