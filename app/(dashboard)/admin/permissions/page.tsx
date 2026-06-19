import { ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { RoleAccessPanel } from "@/components/admin/role-access-panel";
import { getRoleScreenMatrixForAdmin } from "@/lib/auth/role-access";

export default async function AdminPermissionsPage() {
  const matrix = await getRoleScreenMatrixForAdmin();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Visualização de telas"
        description="Controle quais telas cada papel pode ver no menu e acessar no sistema."
        icon={ShieldCheck}
      />
      <RoleAccessPanel initialMatrix={matrix} />
    </div>
  );
}
