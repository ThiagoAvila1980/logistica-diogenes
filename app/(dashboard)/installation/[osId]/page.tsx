import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hammer } from "lucide-react";
import { getServiceOrderById } from "@/lib/data/orders";
import { getInstallationDetailForOs } from "@/lib/data/installation-detail";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { canOperateInstallationModule } from "@/lib/transport-gates";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { getSession } from "@/lib/auth/session";
import { canViewAllOrders } from "@/lib/auth/permissions";
import { listActiveInstallers } from "@/lib/data/installers";
import { MeasurementSpecFields } from "@/components/field/measurement-spec-fields";
import { MeasurementNotesCard } from "@/components/measurement/measurement-notes-card";
import { Button } from "@/components/ui/button";
import { InstallationChecklist } from "@/components/installation/installation-checklist";
import { InstallationServicePhotos } from "@/components/installation/installation-service-photos";

type Props = { params: Promise<{ osId: string }> };

export default async function InstallationOsPage({ params }: Props) {
  const { osId } = await params;
  const [order, session] = await Promise.all([
    getServiceOrderById(osId),
    getSession(),
  ]);
  if (!order) notFound();

  const isManager = canViewAllOrders(session?.roles ?? []);

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
        const assignedInstallerIds = detail.items
          .map((i) => i.installationProgress?.installerId)
          .filter((id): id is string => !!id);
        const hasPerVaoAssignment = assignedInstallerIds.length > 0;
        if (!hasPerVaoAssignment) {
          return order.assignedUserId === session?.userId;
        }
        return item.installationProgress?.installerId === session?.userId;
      });

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
