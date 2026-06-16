import { Layers } from "lucide-react";
import {
  deleteTipoVidroItem,
  getLookupItemsForAdmin,
  saveTipoVidro,
} from "@/actions/lookup-admin-actions";
import { LookupAdminPanel } from "@/components/admin/lookup-admin-panel";
import { PageHeading } from "@/components/dashboard/page-heading";

export default async function AdminTipoVidroPage() {
  const items = await getLookupItemsForAdmin("tipo_vidro");

  return (
    <div className="space-y-4">
      <PageHeading
        title="Tipos de vidro"
        description="Catálogo de tipos de vidro usados nas medições."
        icon={Layers}
      />
      <LookupAdminPanel
        title="Tipos cadastrados"
        description="Informe a descrição do tipo de vidro."
        fieldLabel="Descrição"
        placeholder="Ex: Temperado 8mm, Laminado"
        entityLabel="tipo de vidro"
        deleteDescription="Esta ação é permanente. O tipo de vidro será removido do catálogo."
        items={items}
        saveAction={saveTipoVidro}
        deleteAction={deleteTipoVidroItem}
      />
    </div>
  );
}
