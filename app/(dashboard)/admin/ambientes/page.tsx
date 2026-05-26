import { DoorOpen } from "lucide-react";
import {
  deleteAmbienteItem,
  getLookupItemsForAdmin,
  saveAmbiente,
} from "@/actions/lookup-admin-actions";
import { LookupAdminPanel } from "@/components/admin/lookup-admin-panel";

export default async function AdminAmbientesPage() {
  const items = await getLookupItemsForAdmin("ambientes");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DoorOpen className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Ambientes</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Catálogo de ambientes usados nas medições (Sala, Quarto, Varanda, etc.).
      </p>
      <LookupAdminPanel
        title="Ambientes cadastrados"
        description="Informe a descrição do ambiente."
        fieldLabel="Descrição"
        placeholder="Ex: Sala, Quarto, Varanda"
        items={items}
        saveAction={saveAmbiente}
        deleteAction={deleteAmbienteItem}
      />
    </div>
  );
}
