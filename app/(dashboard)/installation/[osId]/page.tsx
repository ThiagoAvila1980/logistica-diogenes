import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";
import { getServiceOrderById } from "@/lib/data/orders";
import { getInstallationDetailForOs } from "@/lib/data/installation-detail";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { Button } from "@/components/ui/button";
import { InstallationChecklist } from "@/components/installation/installation-checklist";
import { InstallationServicePhotos } from "@/components/installation/installation-service-photos";

type Props = { params: Promise<{ osId: string }> };

export default async function InstallationOsPage({ params }: Props) {
  const { osId } = await params;
  const order = await getServiceOrderById(osId);
  if (!order) notFound();

  const detail = await getInstallationDetailForOs(osId, order.status);

  if (!canOperateInstallationModule(order.status, detail.cuttingSteps)) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Aguardando conclusão do corte para liberar a instalação desta OS.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/installation">
          <ArrowLeft className="h-4 w-4" />
          Voltar à instalação
        </Link>
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-lime-600" />
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

      <div className="space-y-4">
        <InstallationChecklist
          osId={osId}
          initialInstallationSteps={detail.installationSteps}
          initialTransportSteps={detail.transportSteps}
          initialCuttingSteps={detail.cuttingSteps}
        />

        <InstallationServicePhotos
          osId={osId}
          initialPhotos={detail.servicePhotos}
        />
      </div>
    </div>
  );
}
