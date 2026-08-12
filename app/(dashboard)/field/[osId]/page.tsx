import { notFound } from "next/navigation";
import { getServiceOrderById } from "@/lib/data/orders";
import { getFieldMeasurementDraft } from "@/lib/data/field";
import { listMeasurementLookups } from "@/lib/data/lookups";
import { FieldMeasurementForm } from "@/components/field/field-measurement-form";
import { FieldMeasurementPastStage } from "@/components/field/field-measurement-past-stage";
import { FieldDetailCacheHydrator } from "@/components/offline/field-detail-cache-hydrator";
import { getSession } from "@/lib/auth/session";
import {
  canAddVaosAfterCutting,
  canDeleteMeasurement,
  hasAnyRole,
} from "@/lib/auth/permissions";
import {
  hasRemainingUnsentMeasurementItems,
  selectUnsentMeasurementLineItems,
} from "@/lib/workflow/aggregates";
import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { getDb } from "@/lib/db";
import { measurements } from "@/db/schema";
import { eq } from "drizzle-orm";

type Props = {
  params: Promise<{ osId: string }>;
  searchParams: Promise<{ addVaos?: string }>;
};

export default async function FieldOsPage({ params, searchParams }: Props) {
  const { osId } = await params;
  const { addVaos } = await searchParams;
  const order = await getServiceOrderById(osId);
  if (!order) notFound();

  const session = await getSession();
  const roles = session?.roles ?? [];
  const canManage = hasAnyRole(roles, ["admin", "gerente"]);
  const canDelete = canDeleteMeasurement(roles);
  const canAddVaos = canAddVaosAfterCutting(roles);

  const db = getDb();
  const [measRow] = await db
    .select({ items: measurements.items })
    .from(measurements)
    .where(eq(measurements.id, osId))
    .limit(1);
  const allItems = (measRow?.items as MeasurementLineItem[] | null) ?? [];
  const hasRemaining = hasRemainingUnsentMeasurementItems(allItems);
  const inMedicao = order.status.startsWith("medicao");
  const addVaosMode =
    canAddVaos && addVaos === "1" && !inMedicao && !hasRemaining;

  if (!inMedicao && !hasRemaining && !addVaosMode) {
    if (canManage) {
      return <FieldMeasurementPastStage order={order} canDelete={canDelete} />;
    }

    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Esta medição não está em etapa de campo (status: {order.status}).
        </p>
      </div>
    );
  }

  const [draftOrcamento, draftFinal, lookups] = await Promise.all([
    getFieldMeasurementDraft(osId, order, "orcamento"),
    getFieldMeasurementDraft(osId, order, "final"),
    listMeasurementLookups(),
  ]);

  // Com envio parcial ou inclusão posterior, o formulário edita só os vãos não enviados.
  const finalForFormResolved = (() => {
    if (!draftFinal) return draftFinal;
    if (hasRemaining || addVaosMode) {
      return {
        ...draftFinal,
        items: selectUnsentMeasurementLineItems(draftFinal.items ?? []),
      };
    }
    return draftFinal;
  })();

  const draftsByType = {
    orcamento: draftOrcamento,
    final: finalForFormResolved,
  };

  return (
    <>
      <FieldMeasurementForm
        order={order}
        lookups={lookups}
        draftsByType={draftsByType}
        canEditHeader={canManage}
        canDelete={canDelete}
        canSendToCutting={canManage}
        allMeasurementItems={allItems}
        addVaosMode={addVaosMode}
      />
      <FieldDetailCacheHydrator
        order={order}
        draftsByType={draftsByType}
        lookups={lookups}
      />
    </>
  );
}
