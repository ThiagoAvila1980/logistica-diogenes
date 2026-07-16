import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getCuttingDetailForOs } from "@/lib/data/cutting-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getSession } from "@/lib/auth/session";
import { canEditMeasurementHeader, canViewAllOrders, hasRole } from "@/lib/auth/permissions";
import { PageHeading } from "@/components/dashboard/page-heading";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { ServiceOrderHeader } from "@/components/order/service-order-header";
import { ServiceOrderManageActions } from "@/components/order/service-order-manage-actions";
import { Card, CardContent } from "@/components/ui/card";
import { CuttingDetailView } from "@/components/production/cutting-detail-view";
import { getStepCompletionMetaForOs } from "@/lib/data/audit-events";
import { Scissors } from "lucide-react";

type Props = { params: Promise<{ osId: string }> };

export default async function ProductionOsPage({ params }: Props) {
  const { osId } = await params;
  const [order, detail, lookups, session] = await Promise.all([
    getServiceOrderById(osId),
    getCuttingDetailForOs(osId),
    listMeasurementLookups(),
    getSession(),
  ]);
  if (!order) notFound();

  const canEditHeader = canEditMeasurementHeader(session?.roles ?? []);
  const canDelete = canViewAllOrders(session?.roles ?? []);
  const isAdmin = hasRole(session?.roles ?? [], "admin");
  const stepAuditMeta = isAdmin
    ? await getStepCompletionMetaForOs(osId)
    : undefined;

  const { measurement, cutterNotes } = detail;

  return (
    <>
      <PageHeading
        title="Plano de corte"
        icon={Scissors}
        backHref="/production"
        backAriaLabel="Voltar ao plano de corte"
      />
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
            redirectHref="/production"
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

      <div className="space-y-6">
        {measurement ? (
          <CuttingDetailView
            osId={osId}
            osStatus={order.status}
            items={measurement.items}
            photos={measurement.photos}
            lookups={lookups}
            cutterNotes={cutterNotes}
            canEditDrawings={isAdmin}
            stepAuditMeta={stepAuditMeta}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma medição registrada para este item.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
