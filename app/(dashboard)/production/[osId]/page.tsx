import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServiceOrderById } from "@/lib/data/orders";
import { getCuttingDetailForOs } from "@/lib/data/cutting-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CuttingChecklist } from "@/components/production/cutting-checklist";
import { ProductionMeasurementMedia } from "@/components/production/production-measurement-media";

type Props = { params: Promise<{ osId: string }> };

export default async function ProductionOsPage({ params }: Props) {
  const { osId } = await params;
  const [order, detail, lookups] = await Promise.all([
    getServiceOrderById(osId),
    getCuttingDetailForOs(osId),
    listMeasurementLookups(),
  ]);
  if (!order) notFound();

  const { measurement, cuttingSteps } = detail;

  return (
    <div className="p-6 lg:p-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/production">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao plano de corte
        </Link>
      </Button>

      <div className="mb-6">
        <h1 className="font-mono text-2xl font-bold">
          {getOrderDisplayNumber(order)}
        </h1>
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

      <div className="space-y-6">
        <CuttingChecklist osId={osId} initialSteps={cuttingSteps} />

        {measurement ? (
          <ProductionMeasurementMedia
            items={measurement.items}
            photos={measurement.photos}
            notes={measurement.notes}
            lookups={lookups}
          />
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma medição registrada para este item.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
