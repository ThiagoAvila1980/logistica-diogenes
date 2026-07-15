import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getInstallationDetailForOs } from "@/lib/data/installation-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getSession } from "@/lib/auth/session";
import { canViewAllOrders, canEditMeasurementHeader } from "@/lib/auth/permissions";
import { listActiveInstallers } from "@/lib/data/installers";
import { PageHeading } from "@/components/dashboard/page-heading";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { ServiceOrderHeader } from "@/components/order/service-order-header";
import { MeasurementHeaderEditAction } from "@/components/order/measurement-header-edit-action";
import { InstallationChecklist } from "@/components/installation/installation-checklist";
import { InstallationServicePhotos } from "@/components/installation/installation-service-photos";
import { Hammer } from "lucide-react";

type Props = { params: Promise<{ osId: string }> };

export default async function InstallationOsPage({ params }: Props) {
  const { osId } = await params;
  const [order, session] = await Promise.all([
    getServiceOrderById(osId),
    getSession(),
  ]);
  if (!order) notFound();

  const isManager = canViewAllOrders(session?.roles ?? []);
  const canEditHeader = canEditMeasurementHeader(session?.roles ?? []);

  const [detail, lookups] = await Promise.all([
    getInstallationDetailForOs(osId, order.status),
    listMeasurementLookups(),
  ]);
  const installers = isManager
    ? await listActiveInstallers()
    : session
      ? [{ id: session.userId, name: session.name }]
      : [];

  const visibleItems = isManager
    ? detail.items
    : detail.items.filter((item) => {
        const hasPerVaoAssignment = detail.items.some(
          (i) => i.installationProgress?.installerId,
        );
        if (!hasPerVaoAssignment) {
          return order.assignedUserId === session?.userId;
        }
        return item.installationProgress?.installerId === session?.userId;
      });

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
      <MeasurementNotesCard notes={order.notes} className="mt-4" />
    </ServiceOrderHeader>
  );

  if (!canOperateInstallationModule(order.status, detail.cuttingSteps)) {
    return (
      <>
        <PageHeading
          title="Instalação"
          icon={Hammer}
          backHref="/installation"
          backAriaLabel="Voltar à instalação"
        />
        {header}
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Aguardando liberação.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeading
        title="Instalação"
        icon={Hammer}
        backHref="/installation"
        backAriaLabel="Voltar à instalação"
      />
      {header}

      <div className="space-y-4 sm:space-y-6">
        <InstallationChecklist
          osId={osId}
          osStatus={order.status}
          items={visibleItems}
          dailyNotes={detail.dailyNotes}
          lookups={lookups}
          installers={installers}
          canAssignInstaller={isManager}
        />

        <InstallationServicePhotos
          osId={osId}
          initialPhotos={detail.servicePhotos}
        />
      </div>
    </>
  );
}
