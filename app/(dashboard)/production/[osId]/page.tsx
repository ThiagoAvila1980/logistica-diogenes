import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getCuttingDetailForOs } from "@/lib/data/cutting-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { PageHeading } from "@/components/dashboard/page-heading";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { ServiceOrderHeader } from "@/components/order/service-order-header";
import { Card, CardContent } from "@/components/ui/card";
import { CuttingDetailView } from "@/components/production/cutting-detail-view";
import { Scissors } from "lucide-react";

type Props = { params: Promise<{ osId: string }> };

export default async function ProductionOsPage({ params }: Props) {
  const { osId } = await params;
  const [order, detail, lookups] = await Promise.all([
    getServiceOrderById(osId),
    getCuttingDetailForOs(osId),
    listMeasurementLookups(),
  ]);
  if (!order) notFound();

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
