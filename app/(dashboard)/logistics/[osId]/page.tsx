import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";
import { getServiceOrderById } from "@/lib/data/orders";
import { getTransportDetailForOs } from "@/lib/data/transport-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { listVehiclesForTransportSelection } from "@/lib/data/vehicles";
import { listActiveInstallers } from "@/lib/data/installers";
import { canOperateTransportModule } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getSession } from "@/lib/auth/session";
import { canViewAllOrders } from "@/lib/auth/permissions";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { Button } from "@/components/ui/button";
import { TransportChecklist } from "@/components/logistics/transport-checklist";
import { VehicleSelector } from "@/components/logistics/vehicle-selector";

type Props = { params: Promise<{ osId: string }> };

export default async function LogisticsOsPage({ params }: Props) {
  const { osId } = await params;
  const [order, session] = await Promise.all([
    getServiceOrderById(osId),
    getSession(),
  ]);
  if (!order) notFound();

  const isManager = canViewAllOrders(session?.roles ?? []);

  const [detail, lookups] = await Promise.all([
    getTransportDetailForOs(osId, order.status),
    listMeasurementLookups(),
  ]);
  const vehicles = await listVehiclesForTransportSelection(osId);
  const canChangeVehicle = true;

  const installers = isManager ? await listActiveInstallers() : [];

  if (!canOperateTransportModule(order.status, detail.cuttingSteps)) {
    return (
      <>
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h1 className="font-mono text-2xl font-bold">
              {getOrderDisplayNumber(order)}
            </h1>
          </div>
          <p className="mt-1 text-base font-medium text-muted-foreground">
            {order.clientName}
          </p>
        </div>
        <MeasurementNotesCard notes={order.notes} collapsible />
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aguardando conclusão do corte para liberar o transporte desta OS.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 sm:mb-4">
        <Link href="/logistics">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao transporte
        </Link>
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h1 className="font-mono text-2xl font-bold">
            {getOrderDisplayNumber(order)}
          </h1>
        </div>
        <p className="mt-1 text-base font-medium text-muted-foreground">
          {order.clientName}
        </p>
        {order.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {order.description}
          </p>
        )}
        <div className="mt-3">
          <MeasurementSpecFields
            values={{ priority: order.priority }}
            readOnly
          />
        </div>
      </div>

      <MeasurementNotesCard notes={order.notes} collapsible />

      <VehicleSelector
        osId={osId}
        vehicleId={detail.vehicleId}
        vehiclePlate={detail.vehiclePlate}
        vehicleDescription={detail.vehicleDescription}
        vehicles={vehicles}
        canChange={canChangeVehicle}
      />

      <TransportChecklist
        osId={osId}
        osStatus={order.status}
        items={detail.items}
        vehicleId={detail.vehicleId}
        lookups={lookups}
        installers={installers}
        canAssignInstaller={isManager}
      />
    </>
  );
}
