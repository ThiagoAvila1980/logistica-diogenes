"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, StickyNote } from "lucide-react";
import { updateCuttingNotesAction } from "@/actions/cutting-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  osId: string;
  initialNotes: string | null;
};

export function CuttingNotesField({ osId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges = notes.trim() !== savedNotes.trim();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateCuttingNotesAction({
        osId,
        notes: notes.trim() || null,
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4" />
          Observações do cortador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Descreva informações importantes sobre o corte, embalagem ou materiais..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          maxLength={2000}
          className="text-sm"
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {notes.length}/2000 caracteres
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
