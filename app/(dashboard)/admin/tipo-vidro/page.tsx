import { Layers } from "lucide-react";
import {
  deleteTipoVidroItem,
  getLookupItemsForAdmin,
  saveTipoVidro,
} from "@/actions/lookup-admin-actions";
import { LookupAdminPanel } from "@/components/admin/lookup-admin-panel";

export default async function AdminTipoVidroPage() {
  const items = await getLookupItemsForAdmin("tipo_vidro");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Tipos de vidro</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Catálogo de tipos de vidro usados nas medições.
      </p>
      <LookupAdminPanel
        title="Tipos cadastrados"
        description="Informe a descrição do tipo de vidro."
        fieldLabel="Descrição"
        placeholder="Ex: Temperado 8mm, Laminado"
        items={items}
        saveAction={saveTipoVidro}
        deleteAction={deleteTipoVidroItem}
      />
    </div>
  );
}
