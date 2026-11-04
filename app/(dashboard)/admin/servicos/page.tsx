import { Wrench } from "lucide-react";
import { getServicosForAdmin } from "@/actions/servico-actions";
import { ServicoAdminPanel } from "@/components/admin/servico-admin-panel";
import { PageHeading } from "@/components/dashboard/page-heading";

export default async function AdminServicosPage() {
  const servicos = await getServicosForAdmin();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Serviços"
        description="Catálogo de comissão dos serviços que acompanham o vão ou acontecem no dia do instalador."
        icon={Wrench}
      />
      <ServicoAdminPanel servicos={servicos} />
    </div>
  );
}
