"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatBrPhone, maskBrPhoneInput } from "@/lib/phone-format";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange" | "inputMode"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

function normalizeInitialValue(value?: string): string {
  if (!value) return "";
  return formatBrPhone(value);
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      onChange,
      placeholder = "(00)00000-0000",
      ...props
    },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState(() =>
      normalizeInitialValue(defaultValue),
    );

    const display = isControlled ? normalizeInitialValue(value) : internal;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskBrPhoneInput(event.target.value);
      if (!isControlled) setInternal(masked);
      onValueChange?.(masked);
      onChange?.({
        ...event,
        target: { ...event.target, value: masked },
        currentTarget: { ...event.currentTarget, value: masked },
      });
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";
