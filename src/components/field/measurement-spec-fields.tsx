"use client";

import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PriorityBadge } from "@/components/dashboard/priority-badge";
import type { MeasurementPriority } from "@/db/schema";

type Values = {
  priority: MeasurementPriority;
};

type EditableProps = {
  values: Values;
  onChange: (values: Values) => void;
  disabled?: boolean;
  readOnly?: false;
};

type ReadOnlyProps = {
  values: Values;
  readOnly: true;
};

type Props = EditableProps | ReadOnlyProps;

export function MeasurementSpecFields(props: Props) {
  const { values, readOnly = false } = props;
  const disabled = "disabled" in props ? (props.disabled ?? false) : false;
  const onChange = "onChange" in props ? props.onChange : undefined;
  if (readOnly) {
    return <PriorityBadge priority={values.priority} />;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="meas-priority">Prioridade</Label>
      <Select
        id="meas-priority"
        name="priority"
        value={values.priority}
        disabled={disabled}
        className="h-11"
        onChange={(e) =>
          onChange?.({
            priority: e.target.value as MeasurementPriority,
          })
        }
      >
        <option value="normal">Normal</option>
        <option value="alta">Alta</option>
        <option value="urgente">Urgente</option>
      </Select>
    </div>
  );
}

export function parseOptionalUuid(
  value: FormDataEntryValue | null,
): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}
