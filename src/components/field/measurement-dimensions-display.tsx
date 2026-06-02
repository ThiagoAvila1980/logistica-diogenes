import type { MeasurementLineItem } from "@/lib/workflow/schemas";
import { getAlturas, getLarguras } from "@/lib/measurement/dimensions";

function DimensionValues({
  label,
  values,
}: {
  label: string;
  values: number[];
}) {
  if (values.length === 0) {
    return (
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-mono font-semibold tabular-nums">—</dd>
      </div>
    );
  }

  if (values.length === 1) {
    return (
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
          {values[0]} mm
        </dd>
      </div>
    );
  }

  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 space-y-0.5">
        {values.map((value, index) => (
          <p
            key={`${label}-${index}`}
            className="font-mono text-sm font-semibold tabular-nums"
          >
            <span className="text-xs font-normal text-muted-foreground">
              {index + 1}.{" "}
            </span>
            {value} mm
          </p>
        ))}
      </dd>
    </div>
  );
}

export function MeasurementDimensionsDisplay({
  item,
}: {
  item: MeasurementLineItem;
}) {
  const larguras = getLarguras(item);
  const alturas = getAlturas(item);

  return (
    <>
      <div>
        <dt className="text-xs text-muted-foreground">Quantidade</dt>
        <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
          {item.qty > 0 ? item.qty : "—"}
        </dd>
      </div>
      <DimensionValues label="Largura" values={larguras} />
      <DimensionValues label="Altura" values={alturas} />
    </>
  );
}
