import { DoorOpen } from "lucide-react";
import {
  deleteAmbienteItem,
  getLookupItemsForAdmin,
  saveAmbiente,
} from "@/actions/lookup-admin-actions";
import { LookupAdminPanel } from "@/components/admin/lookup-admin-panel";
import { PageHeading } from "@/components/dashboard/page-heading";

export default async function AdminAmbientesPage() {
  const items = await getLookupItemsForAdmin("ambientes");

  return (
    <div className="space-y-4">
      <PageHeading
        title="Ambientes"
        description="Catálogo de ambientes usados nas medições (Sala, Quarto, Varanda, etc.)."
        icon={DoorOpen}
      />
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
