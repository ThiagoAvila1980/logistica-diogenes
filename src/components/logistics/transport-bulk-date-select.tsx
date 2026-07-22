"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { assignScheduledDateToAllVaosAction } from "@/actions/transport-actions";

type Props = {
  osId: string;
};

/** Atribui a mesma data a todas as etapas de todos os vãos da OS. */
export function TransportBulkDateSelect({ osId }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function handleChange(value: string) {
    setSelectedDate(value);
    setLoading(true);
    setError(null);
    setOkMessage(null);

    const result = await assignScheduledDateToAllVaosAction({
      osId,
      scheduledTransportDate: value || null,
    });

    if (!result.success) {
      setError(result.message);
    } else {
      setOkMessage(
        value
          ? "Data aplicada a todos os vãos"
          : "Data removida de todos os vãos",
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          type="date"
          value={selectedDate}
          disabled={loading}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs sm:max-w-xs"
          onChange={(e) => void handleChange(e.target.value)}
          aria-label="Data para todos os vãos"
        />
        {selectedDate && !loading && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => void handleChange("")}
          >
            Limpar
          </button>
        )}
        {loading && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {okMessage && !error && (
        <p className="text-[11px] text-success-foreground">{okMessage}</p>
      )}
    </div>
  );
}
