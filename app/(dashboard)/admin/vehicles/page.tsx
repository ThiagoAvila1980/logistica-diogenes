import { getVehiclesForAdmin } from "@/actions/vehicle-actions";
import { VehicleAdminPanel } from "@/components/admin/vehicle-admin-panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Car } from "lucide-react";

export default async function AdminVehiclesPage() {
  const vehicles = await getVehiclesForAdmin();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Veículos"
        description="Veículos vinculados ao transporte para rastrear qual está em uso."
        icon={Car}
      />
      <VehicleAdminPanel vehicles={vehicles} />
    </div>
  );
}
