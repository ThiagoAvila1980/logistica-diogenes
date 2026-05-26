"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  brDateToIso,
  formatBrDate,
  isoDateToBr,
  maskBrDateInput,
  parseBrDate,
} from "@/lib/date-format";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

function normalizeInitialValue(value?: string): string {
  if (!value) return "";
  if (value.includes("/")) return maskBrDateInput(value);
  const parsed = parseBrDate(value);
  return parsed ? formatBrDate(parsed) : maskBrDateInput(value);
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      onChange,
      placeholder = "DD/MM/AAAA",
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState(() =>
      normalizeInitialValue(defaultValue),
    );
    const nativeDateRef = React.useRef<HTMLInputElement>(null);

    const display = isControlled ? normalizeInitialValue(value) : internal;

    const emitChange = (nextValue: string) => {
      if (!isControlled) setInternal(nextValue);
      onValueChange?.(nextValue);
    };

    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const masked = maskBrDateInput(event.target.value);
      emitChange(masked);
      onChange?.({
        ...event,
        target: { ...event.target, value: masked },
        currentTarget: { ...event.currentTarget, value: masked },
      });
    };

    const handleNativeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const brValue = isoDateToBr(event.target.value);
      emitChange(brValue);
    };

    const openCalendar = () => {
      if (disabled) return;
      const nativeInput = nativeDateRef.current;
      if (!nativeInput) return;

      const isoValue = brDateToIso(display);
      // Não pré-selecionar hoje quando vazio — senão o picker não dispara onChange ao clicar no dia atual.
      nativeInput.value = isoValue;

      if (typeof nativeInput.showPicker === "function") {
        nativeInput.showPicker();
        return;
      }

      nativeInput.click();
    };

    return (
      <div className="relative flex w-full items-center">
        <Input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          disabled={disabled}
          onChange={handleTextChange}
          className={cn("pr-8", className)}
          {...props}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={openCalendar}
          className={cn(
            "absolute right-1 flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          aria-label="Abrir calendário"
          tabIndex={-1}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        </button>
        <input
          ref={nativeDateRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          onChange={handleNativeChange}
        />
      </div>
    );
  },
);
DateInput.displayName = "DateInput";
