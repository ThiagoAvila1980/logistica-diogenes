import { Palette } from "lucide-react";
import {
  deleteCor,
  getLookupItemsForAdmin,
  saveCor,
} from "@/actions/lookup-admin-actions";
import { LookupAdminPanel } from "@/components/admin/lookup-admin-panel";
import { PageHeading } from "@/components/dashboard/page-heading";

export default async function AdminCoresPage() {
  const items = await getLookupItemsForAdmin("cores");

  return (
    <div className="space-y-4">
      <PageHeading
        title="Cores de perfil"
        description="Opções de cor do perfil disponíveis nas medições."
        icon={Palette}
      />
      <LookupAdminPanel
        title="Cores cadastradas"
        description="Informe a descrição da cor do perfil."
        fieldLabel="Descrição"
        placeholder="Ex: Branco, Bronze, Preto"
        items={items}
        saveAction={saveCor}
        deleteAction={deleteCor}
      />
    </div>
  );
}
