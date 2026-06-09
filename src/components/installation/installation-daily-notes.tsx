"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Loader2, Plus, Save, StickyNote } from "lucide-react";
import { saveInstallationDailyNote } from "@/actions/installation-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatBrDate, getLocalIsoDate } from "@/lib/date-format";
import type { InstallationDailyNote } from "@/lib/workflow/schemas";
import { cn } from "@/lib/utils";

type Props = {
  osId: string;
  initialNotes?: InstallationDailyNote[];
};

function sortNotes(notes: InstallationDailyNote[]): InstallationDailyNote[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date));
}

export function InstallationDailyNotes({
  osId,
  initialNotes = [],
}: Props) {
  const today = getLocalIsoDate();
  const [notes, setNotes] = useState(() => sortNotes(initialNotes));
  const [draft, setDraft] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const todayNote = useMemo(
    () => notes.find((note) => note.date === today),
    [notes, today],
  );

  const canAddToday = !todayNote && !showComposer;
  const isEditingToday = showComposer;

  function handleOpenComposer(initialText = "") {
    setError(null);
    setDraft(initialText);
    setShowComposer(true);
  }

  function handleCancelComposer() {
    setError(null);
    setDraft("");
    setShowComposer(false);
  }

  function handleSave() {
    const text = draft.trim();
    if (!text) {
      setError("Descreva o que foi feito no dia.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveInstallationDailyNote({
        osId,
        date: today,
        text,
      });

      if (result.success) {
        setNotes((prev) =>
          sortNotes([
            ...prev.filter((note) => note.date !== result.note.date),
            result.note,
          ]),
        );
        setDraft("");
        setShowComposer(false);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <StickyNote className="h-4 w-4 text-success" />
            Observações diárias
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Registre o que foi feito a cada dia de serviço. Uma observação por dia.
          </p>
        </div>
        {canAddToday && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => handleOpenComposer()}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar observação
          </Button>
        )}
        {todayNote && !isEditingToday && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => handleOpenComposer(todayNote.text)}
          >
            Editar de hoje
          </Button>
        )}
      </div>

      {showComposer && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Hoje — {formatBrDate(today)}
          </p>
          <Textarea
            placeholder="Descreva o que foi feito hoje na instalação..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={2000}
            className="text-sm"
            autoFocus
          />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {draft.length}/2000 caracteres
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancelComposer}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isPending || !draft.trim()}
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
          </div>
        </div>
      )}

      {!showComposer && error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notes.length === 0 && !showComposer ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhuma observação registrada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            if (note.date === today && isEditingToday) return null;

            return (
            <div
              key={note.date}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                note.date === today
                  ? "border-success-border bg-success-muted/40"
                  : "border-border bg-card",
              )}
            >
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatBrDate(note.date)}
                {note.date === today && (
                  <span className="normal-case tracking-normal text-success-foreground">
                    (hoje)
                  </span>
                )}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                {note.text}
              </p>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
