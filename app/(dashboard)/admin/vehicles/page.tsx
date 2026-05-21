import { getVehiclesForAdmin } from "@/actions/vehicle-actions";
import { VehicleAdminPanel } from "@/components/admin/vehicle-admin-panel";
import { Car } from "lucide-react";

export default async function AdminVehiclesPage() {
  const vehicles = await getVehiclesForAdmin();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Car className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Veículos</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Veículos vinculados ao transporte para rastrear qual está em uso.
      </p>
      <VehicleAdminPanel vehicles={vehicles} />
    </div>
  );
}
