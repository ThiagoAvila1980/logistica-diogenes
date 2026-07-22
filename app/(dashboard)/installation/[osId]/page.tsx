import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getInstallationDetailForOs } from "@/lib/data/installation-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getSession } from "@/lib/auth/session";
import {
  canViewAllOrders,
  canEditMeasurementHeader,
  hasRole,
} from "@/lib/auth/permissions";
import { listActiveInstallers } from "@/lib/data/installers";
import { PageHeading } from "@/components/dashboard/page-heading";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { ServiceOrderHeader } from "@/components/order/service-order-header";
import { ServiceOrderManageActions } from "@/components/order/service-order-manage-actions";
import { InstallationChecklist } from "@/components/installation/installation-checklist";
import { InstallationServicePhotos } from "@/components/installation/installation-service-photos";
import { getStepCompletionMetaForOs } from "@/lib/data/audit-events";
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
  const isAdmin = hasRole(session?.roles ?? [], "admin");
  const canDelete = isManager;
  const canEditHeader = canEditMeasurementHeader(session?.roles ?? []);

  const [detail, lookups, stepAuditMeta] = await Promise.all([
    getInstallationDetailForOs(osId, order.status),
    listMeasurementLookups(),
    isAdmin ? getStepCompletionMetaForOs(osId) : Promise.resolve(undefined),
  ]);
  const installers = isManager
    ? await listActiveInstallers()
    : session
      ? [{ id: session.userId, name: session.name }]
      : [];

  const visibleItems = isManager
    ? detail.items
    : detail.items.filter(
        (item) => item.installationProgress?.installerId === session?.userId,
      );

  if (!isManager && visibleItems.length === 0) {
    notFound();
  }

  const header = (
    <ServiceOrderHeader
      displayNumber={getOrderDisplayNumber(order)}
      clientName={order.clientName}
      clientPhone={order.clientPhone}
      clientAddress={order.clientAddress}
      description={order.description}
      className="mb-4 sm:mb-6"
      actions={
        <ServiceOrderManageActions
          osId={order.id}
          displayNumber={getOrderDisplayNumber(order)}
          clientName={order.clientName}
          clientPhone={order.clientPhone}
          clientAddress={order.clientAddress}
          budgetReference={order.budgetReference}
          canEditHeader={canEditHeader}
          canDelete={canDelete}
          redirectHref="/installation"
        />
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
          stepAuditMeta={stepAuditMeta}
        />

        <InstallationServicePhotos
          osId={osId}
          initialPhotos={detail.servicePhotos}
        />
      </div>
    </>
  );
}
