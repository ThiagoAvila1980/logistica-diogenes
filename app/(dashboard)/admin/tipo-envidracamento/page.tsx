import { PanelTop } from "lucide-react";
import {
  deleteTipoEnvidracamentoItem,
  getLookupItemsForAdmin,
  saveTipoEnvidracamento,
} from "@/actions/lookup-admin-actions";
import { LookupAdminPanel } from "@/components/admin/lookup-admin-panel";

export default async function AdminTipoEnvidracamentoPage() {
  const items = await getLookupItemsForAdmin("tipo_envidracamento");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PanelTop className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Tipos de envidraçamento</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Catálogo de sistemas de envidraçamento disponíveis nas medições.
      </p>
      <LookupAdminPanel
        title="Tipos cadastrados"
        description="Informe a descrição do tipo de envidraçamento."
        fieldLabel="Descrição"
        placeholder="Ex: Correr, Pivotante, Fixo"
        items={items}
        saveAction={saveTipoEnvidracamento}
        deleteAction={deleteTipoEnvidracamentoItem}
      />
    </div>
  );
}
