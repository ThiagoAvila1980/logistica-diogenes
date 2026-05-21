"use client";

import { cn } from "@/lib/utils";
import type { MeasurementDbType } from "@/lib/workflow/measurement-actions";
import { getMeasurementActionLabel } from "@/lib/workflow/measurement-actions";
import { Label } from "@/components/ui/label";

type MeasurementTypeFieldProps = {
  value: MeasurementDbType;
  onChange?: (value: MeasurementDbType) => void;
  name?: string;
  disabled?: boolean;
  className?: string;
};

const OPTIONS: MeasurementDbType[] = ["orcamento", "final"];

export function MeasurementTypeField({
  value,
  onChange,
  name = "measurementType",
  disabled,
  className,
}: MeasurementTypeFieldProps) {
  return (
    <fieldset className={cn("space-y-2", className)}>
      <Label asChild>
        <legend className="text-sm font-medium">Tipo de medição</legend>
      </Label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTIONS.map((type) => {
          const selected = value === type;
          const label = getMeasurementActionLabel(type);

          return (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border bg-background hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={name}
                value={type}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange?.(type)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <span className="font-medium leading-tight">{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
