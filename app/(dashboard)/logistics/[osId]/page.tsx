import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getTransportDetailForOs } from "@/lib/data/transport-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { listVehiclesForTransportSelection } from "@/lib/data/vehicles";
import { listActiveDrivers } from "@/lib/data/drivers";
import { listActiveInstallers } from "@/lib/data/installers";
import { canOperateTransportModule } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getSession } from "@/lib/auth/session";
import { canViewAllOrders, canEditMeasurementHeader } from "@/lib/auth/permissions";
import { PageHeading } from "@/components/dashboard/page-heading";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { ServiceOrderHeader } from "@/components/order/service-order-header";
import { MeasurementHeaderEditAction } from "@/components/order/measurement-header-edit-action";
import { TransportChecklist } from "@/components/logistics/transport-checklist";
import { SendToInstallationDialog } from "@/components/logistics/send-to-installation-dialog";
import { Truck } from "lucide-react";

type Props = { params: Promise<{ osId: string }> };

export default async function LogisticsOsPage({ params }: Props) {
  const { osId } = await params;
  const [order, session] = await Promise.all([
    getServiceOrderById(osId),
    getSession(),
  ]);
  if (!order) notFound();

  const isManager = canViewAllOrders(session?.roles ?? []);
  const canEditHeader = canEditMeasurementHeader(session?.roles ?? []);

  const [detail, lookups] = await Promise.all([
    getTransportDetailForOs(osId, order.status),
    listMeasurementLookups(),
  ]);
  const vehicles = await listVehiclesForTransportSelection(osId);

  const drivers = isManager ? await listActiveDrivers() : [];
  const installers = isManager ? await listActiveInstallers() : [];

  const header = (
    <ServiceOrderHeader
      displayNumber={getOrderDisplayNumber(order)}
      clientName={order.clientName}
      clientPhone={order.clientPhone}
      clientAddress={order.clientAddress}
      description={order.description}
      className="mb-4 sm:mb-6"
      actions={
        canEditHeader ? (
          <MeasurementHeaderEditAction
            osId={order.id}
            clientName={order.clientName}
            clientPhone={order.clientPhone}
            clientAddress={order.clientAddress}
            budgetReference={order.budgetReference}
          />
        ) : undefined
      }
    >
      <div className="mt-3">
        <MeasurementSpecFields
          values={{ priority: order.priority }}
          readOnly
        />
      </div>
    </ServiceOrderHeader>
  );

  if (!canOperateTransportModule(order.status, detail.cuttingSteps)) {
    return (
      <>
        <PageHeading
          title="Transporte"
          icon={Truck}
          backHref="/logistics"
          backAriaLabel="Voltar ao transporte"
        />
        {header}
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
      <PageHeading
        title="Transporte"
        icon={Truck}
        backHref="/logistics"
        backAriaLabel="Voltar ao transporte"
      />
      {header}

      <MeasurementNotesCard notes={order.notes} collapsible />

      <TransportChecklist
        osId={osId}
        osStatus={order.status}
        items={detail.items}
        vehicles={vehicles}
        lookups={lookups}
        drivers={drivers}
        canAssignDriver={isManager}
        canAssignVehicle
      />

      {isManager && (
        <SendToInstallationDialog
          osId={osId}
          osNumber={getOrderDisplayNumber(order)}
          clientName={order.clientName}
          items={detail.items}
          installers={installers}
          lookups={lookups}
        />
      )}
    </>
  );
}
