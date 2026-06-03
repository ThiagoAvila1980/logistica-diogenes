import { PanelTop } from "lucide-react";
import {
  deleteTipoEnvidracamentoItem,
  getLookupItemsForAdmin,
  saveTipoEnvidracamento,
} from "@/actions/lookup-admin-actions";
import { TipoEnvidracamentoAdminPanel } from "@/components/admin/tipo-envidracamento-admin-panel";
import { PageHeading } from "@/components/dashboard/page-heading";

export default async function AdminTipoEnvidracamentoPage() {
  const items = await getLookupItemsForAdmin("tipo_envidracamento");

  return (
    <div className="space-y-4">
      <PageHeading
        title="Tipos de envidraçamento"
        description="Catálogo de sistemas de envidraçamento disponíveis nas medições."
        icon={PanelTop}
      />
      <TipoEnvidracamentoAdminPanel
        items={items}
        saveAction={saveTipoEnvidracamento}
        deleteAction={deleteTipoEnvidracamentoItem}
      />
    </div>
  );
}
