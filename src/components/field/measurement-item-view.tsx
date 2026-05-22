import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { ResolvedImage } from "@/components/ui/resolved-image";

type MeasurementItemViewProps = {
  item: MeasurementLineItem;
  index: number;
};

export function MeasurementItemView({ item, index }: MeasurementItemViewProps) {
  const hasDrawing = Boolean(item.drawingUrl);

  return (
    <article className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium">Medição {index + 1}</h3>

      {hasDrawing ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <ResolvedImage
            src={item.drawingUrl!}
            alt={`Desenho da medição ${index + 1}`}
            className="mx-auto max-h-[min(70vh,480px)] w-full object-contain"
            fallbackClassName="min-h-[120px]"
          />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          Sem desenho registrado
        </p>
      )}

      <MeasurementDimensionsSummary item={item} />
    </article>
  );
}

export function MeasurementDimensionsSummary({
  item,
}: {
  item: MeasurementLineItem;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      {item.ambiente?.trim() ? (
        <div className="mb-3">
          <dt className="text-xs text-muted-foreground">Ambiente</dt>
          <dd className="mt-0.5 text-sm font-medium">{item.ambiente.trim()}</dd>
        </div>
      ) : null}
      <h4 className="text-sm font-medium">Dimensões (mm)</h4>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Quantidade</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums">
            {item.qty > 0 ? item.qty : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Largura</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums">
            {item.largura > 0 ? item.largura : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Altura</dt>
          <dd className="mt-0.5 font-mono font-semibold tabular-nums">
            {item.altura > 0 ? item.altura : "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function hasSavedMeasurementForView(
  draft?: {
    items?: MeasurementLineItem[];
    photos?: string[];
    notes?: string;
  },
): boolean {
  if (!draft) return false;
  if (draft.photos?.length) return true;
  if (draft.notes?.trim()) return true;
  if (!draft.items?.length) return false;

  return draft.items.some(
    (item) =>
      Boolean(item.drawingUrl) ||
      Boolean(item.ambiente?.trim()) ||
      (item.qty > 0 && item.largura > 0 && item.altura > 0),
  );
}
