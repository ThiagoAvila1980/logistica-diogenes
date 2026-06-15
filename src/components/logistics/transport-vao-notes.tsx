"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { updateItemTransportNotesAction } from "@/actions/transport-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TransportVaoNotesFieldProps = {
  osId: string;
  itemId: string;
  vaoLabel: string;
  initialNotes?: string | null;
};

export function TransportVaoNotesField({
  osId,
  itemId,
  vaoLabel,
  initialNotes,
}: TransportVaoNotesFieldProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges = notes.trim() !== savedNotes.trim();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateItemTransportNotesAction({
        osId,
        itemId,
        observacoes: notes.trim() || null,
      });

      if (result.success) {
        const next = notes.trim();
        setSavedNotes(next);
        setNotes(next);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="mt-2.5 space-y-2 rounded-md border border-border/80 bg-muted/20 p-2.5">
      <Label
        htmlFor={`transport-notes-${itemId}`}
        className="text-[11px] font-semibold text-foreground"
      >
        Observações — {vaoLabel}
      </Label>
      <Textarea
        id={`transport-notes-${itemId}`}
        placeholder="Anotações sobre carga, entrega ou restrições deste vão..."
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        maxLength={2000}
        className="min-h-[72px] text-xs"
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {notes.length}/2000 caracteres
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          className="h-7 gap-1.5 px-2 text-[11px]"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Salvar
        </Button>
      </div>
    </div>
  );
}
