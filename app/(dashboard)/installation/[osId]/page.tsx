import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hammer } from "lucide-react";
import { getServiceOrderById } from "@/lib/data/orders";
import { getInstallationDetailForOs } from "@/lib/data/installation-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { Button } from "@/components/ui/button";
import { InstallationChecklist } from "@/components/installation/installation-checklist";
import { InstallationServicePhotos } from "@/components/installation/installation-service-photos";

type Props = { params: Promise<{ osId: string }> };

export default async function InstallationOsPage({ params }: Props) {
  const { osId } = await params;
  const order = await getServiceOrderById(osId);
  if (!order) notFound();

  const [detail, lookups] = await Promise.all([
    getInstallationDetailForOs(osId, order.status),
    listMeasurementLookups(),
  ]);

  if (!canOperateInstallationModule(order.status, detail.cuttingSteps)) {
    return (
      <>
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Hammer className="h-5 w-5 shrink-0 text-success" />
            <h1 className="font-mono text-xl font-bold sm:text-2xl">
              {getOrderDisplayNumber(order)}
            </h1>
          </div>
          <p className="mt-1 text-base font-medium text-muted-foreground">
            {order.clientName}
          </p>
          <MeasurementNotesCard notes={order.notes} className="mt-4" />
        </div>
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
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 sm:mb-4">
        <Link href="/installation">
          <ArrowLeft className="h-4 w-4" />
          Voltar à instalação
        </Link>
      </Button>

      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Hammer className="h-5 w-5 shrink-0 text-success" />
          <h1 className="font-mono text-xl font-bold sm:text-2xl">
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
        <MeasurementNotesCard notes={order.notes} className="mt-4" />
      </div>

      <div className="space-y-4 sm:space-y-6">
        <InstallationChecklist
          osId={osId}
          osStatus={order.status}
          items={detail.items}
          lookups={lookups}
        />

        <InstallationServicePhotos
          osId={osId}
          initialPhotos={detail.servicePhotos}
        />
      </div>
    </>
  );
}
