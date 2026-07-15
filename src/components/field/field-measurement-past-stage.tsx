import { Ruler } from "lucide-react";
import { ServiceOrderManageActions } from "@/components/order/service-order-manage-actions";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ServiceOrderHeader } from "@/components/order/service-order-header";
import type { OrderDetail } from "@/lib/data/types";
import { getOrderDisplayNumber } from "@/lib/order-display";
import { STATUS_LABELS } from "@/lib/workflow/status-machine";

type FieldMeasurementPastStageProps = {
  order: OrderDetail;
};

/** OS que já saiu da fase de medição — admin/gerente ainda podem excluir. */
export function FieldMeasurementPastStage({ order }: FieldMeasurementPastStageProps) {
  const displayNumber = getOrderDisplayNumber({
    number: order.number,
    budgetReference: order.budgetReference,
    numeroOrcamento: null,
  });

  return (
    <div className="flex flex-col gap-4 mobile-form-offset md:pb-0">
      <PageHeading
        title="Medição"
        icon={Ruler}
        backHref="/field"
        backAriaLabel="Voltar às medições"
      />
      <ServiceOrderHeader
        displayNumber={displayNumber}
        clientName={order.clientName}
        clientPhone={order.clientPhone}
        clientAddress={order.clientAddress}
        description={order.description}
        actions={
          <ServiceOrderManageActions
            osId={order.id}
            displayNumber={displayNumber}
            clientName={order.clientName}
            clientPhone={order.clientPhone}
            clientAddress={order.clientAddress}
            budgetReference={order.budgetReference}
            canDelete
            redirectHref="/field"
          />
        }
      />
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Esta OS já avançou para a etapa{" "}
        <span className="font-medium text-foreground">
          {STATUS_LABELS[order.status]}
        </span>
        . A edição de medição não está disponível, mas você pode excluir o
        orçamento permanentemente pelo botão acima.
      </p>
    </div>
  );
}
