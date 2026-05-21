import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getFieldMeasurementDraft } from "@/lib/data/field";
import { FieldMeasurementForm } from "@/components/field/field-measurement-form";
import { getSession } from "@/lib/auth/session";
import { hasAnyRole } from "@/lib/auth/permissions";

type Props = { params: Promise<{ osId: string }> };

export default async function FieldOsPage({ params }: Props) {
  const { osId } = await params;
  const order = await getServiceOrderById(osId);
  if (!order) notFound();

  if (!order.status.startsWith("medicao")) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Esta OS não está em etapa de medição (status: {order.status}).
        </p>
      </div>
    );
  }

  const [draftOrcamento, draftFinal] = await Promise.all([
    getFieldMeasurementDraft(osId, order, "orcamento"),
    getFieldMeasurementDraft(osId, order, "final"),
  ]);

  const session = await getSession();
  const canDelete = hasAnyRole(session?.roles ?? [], ["admin", "gerente"]);

  return (
    <FieldMeasurementForm
      order={order}
      draftsByType={{
        orcamento: draftOrcamento,
        final: draftFinal,
      }}
      canDelete={canDelete}
    />
  );
}
