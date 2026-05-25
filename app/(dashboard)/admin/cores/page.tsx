import { Palette } from "lucide-react";
import {
  deleteCor,
  getLookupItemsForAdmin,
  saveCor,
} from "@/actions/lookup-admin-actions";
import { LookupAdminPanel } from "@/components/admin/lookup-admin-panel";

export default async function AdminCoresPage() {
  const items = await getLookupItemsForAdmin("cores");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Cores de perfil</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Opções de cor do perfil disponíveis nas medições.
      </p>
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
