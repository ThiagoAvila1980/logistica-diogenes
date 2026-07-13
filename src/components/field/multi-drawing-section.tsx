"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn, generateId } from "@/lib/utils";
import type { DrawingItem } from "@/lib/workflow/schemas";
import { DrawingEditorModal } from "@/components/field/drawing-editor-modal";
import { resolveUploadDisplayUrlAction } from "@/actions/upload-actions";
import { Button } from "@/components/ui/button";

const LEGACY_ID = "__legacy__";

type MultiDrawingSectionProps = {
  drawings: DrawingItem[];
  /** URL legada (drawingUrl) — exibida quando drawings está vazio */
  legacyDrawingUrl?: string | null;
  onDrawingsChange: (drawings: DrawingItem[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
  templateImageUrl?: string | null;
  templateKey?: number;
  disabled?: boolean;
  /** Abre o editor deste desenho ao montar (ex.: vindo do modo visualização). */
  initialActiveDrawingId?: string | null;
  onInitialActiveDrawingApplied?: () => void;
};

function isDirectDisplayUrl(url: string): boolean {
  return (
    url.startsWith("data:") ||
    url.startsWith("/uploads/") ||
    url.startsWith("uploads/")
  );
}

export function MultiDrawingSection({
  drawings,
  legacyDrawingUrl,
  onDrawingsChange,
  onDirtyChange,
  templateImageUrl,
  templateKey = 0,
  disabled,
  initialActiveDrawingId,
  onInitialActiveDrawingApplied,
}: MultiDrawingSectionProps) {
  const [activeDrawingId, setActiveDrawingId] = useState<string | null>(null);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const resolveKeyRef = useRef("");
  // Ref para evitar closure stale ao notificar o pai
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  });

  useEffect(() => {
    if (!initialActiveDrawingId) return;
    setActiveDrawingId(initialActiveDrawingId);
    onInitialActiveDrawingApplied?.();
  }, [initialActiveDrawingId, onInitialActiveDrawingApplied]);

  // Notifica o pai APÓS o commit, nunca durante render
  useEffect(() => {
    onDirtyChangeRef.current?.(dirtyIds.size > 0);
  }, [dirtyIds]);

  // Lista efetiva: usa legacy como fallback quando drawings está vazio
  const effectiveDrawings: DrawingItem[] =
    drawings.length === 0 && legacyDrawingUrl
      ? [{ id: LEGACY_ID, url: legacyDrawingUrl }]
      : drawings;

  // Resolve URLs de storage para exibição nas miniaturas
  useEffect(() => {
    const key = effectiveDrawings.map((d) => `${d.id}:${d.url}`).join("|");
    if (key === resolveKeyRef.current) return;
    resolveKeyRef.current = key;

    for (const d of effectiveDrawings) {
      if (!d.url) continue;
      if (isDirectDisplayUrl(d.url)) {
        const direct = d.url.startsWith("uploads/") ? `/${d.url}` : d.url;
        setResolvedUrls((prev) =>
          prev[d.id] === direct ? prev : { ...prev, [d.id]: direct },
        );
        continue;
      }
      void resolveUploadDisplayUrlAction(d.url).then((resolved) => {
        setResolvedUrls((prev) => ({ ...prev, [d.id]: resolved }));
      });
    }
  });

  function setDirty(id: string, dirty: boolean) {
    setDirtyIds((prev) => {
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleSave(id: string, base64: string) {
    if (id === LEGACY_ID) {
      const newId = generateId();
      onDrawingsChange([{ id: newId, url: base64 }]);
    } else {
      const exists = drawings.some((d) => d.id === id);
      if (exists) {
        onDrawingsChange(
          drawings.map((d) => (d.id === id ? { ...d, url: base64 } : d)),
        );
      } else {
        onDrawingsChange([...drawings, { id, url: base64 }]);
      }
    }
    setDirtyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setActiveDrawingId(null);
  }

  function handleDeleteDrawing(id: string) {
    if (id === LEGACY_ID) {
      onDrawingsChange([]);
    } else {
      onDrawingsChange(drawings.filter((d) => d.id !== id));
    }
    if (activeDrawingId === id) setActiveDrawingId(null);
  }

  function handleAddDrawing() {
    if (disabled) return;
    setActiveDrawingId(generateId());
  }

  const activeDrawing =
    effectiveDrawings.find((d) => d.id === activeDrawingId) ?? null;

  function getDisplayUrl(d: DrawingItem): string | null {
    if (!d.url) return null;
    if (isDirectDisplayUrl(d.url)) {
      return d.url.startsWith("uploads/") ? `/${d.url}` : d.url;
    }
    return resolvedUrls[d.id] ?? null;
  }

  const activeDrawingDisplayUrl = activeDrawing
    ? getDisplayUrl(activeDrawing)
    : null;

  const activeDrawingNeedsResolve =
    Boolean(activeDrawing?.url) &&
    !isDirectDisplayUrl(activeDrawing!.url) &&
    !activeDrawingDisplayUrl;

  // Desenho novo = ainda não existe na lista (usuário acabou de tocar em "+")
  const isNewDrawing =
    activeDrawingId !== null && activeDrawing === null;

  // Carrega o template quando:
  //  • é um desenho novo E há template configurado (tipo envidraçamento com imagem)
  //  • OU o template mudou (tipo trocado) — recarrega no desenho em edição
  const shouldLoadTemplate =
    Boolean(templateImageUrl) && (isNewDrawing || templateKey > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">
          Desenhos
          {effectiveDrawings.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({effectiveDrawings.length})
            </span>
          )}
        </span>
        {!disabled && effectiveDrawings.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={handleAddDrawing}
          >
            <Plus className="h-3 w-3" />
            Novo
          </Button>
        )}
      </div>

      {effectiveDrawings.length === 0 ? (
        /* Estado vazio: botão grande para adicionar o primeiro desenho */
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/10 px-3 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/20 disabled:pointer-events-none disabled:opacity-60"
          onClick={handleAddDrawing}
          disabled={disabled}
        >
          <Plus className="h-5 w-5" />
          Adicionar desenho
        </button>
      ) : (
        /* Faixa horizontal de miniaturas */
        <div className="flex gap-2 overflow-x-auto pb-1">
          {effectiveDrawings.map((d, idx) => {
            const resolvedUrl = getDisplayUrl(d) ?? undefined;
            const isDirty = dirtyIds.has(d.id);

            return (
              <div
                key={d.id}
                className={cn(
                  "relative flex-shrink-0 overflow-hidden rounded-lg border bg-muted/20",
                  "h-[88px] w-[116px]",
                  isDirty && "border-warning ring-1 ring-warning/40",
                )}
              >
                {/* Toque na miniatura para editar */}
                <button
                  type="button"
                  className="h-full w-full"
                  onClick={() => !disabled && setActiveDrawingId(d.id)}
                  disabled={disabled}
                  aria-label={`Editar desenho ${idx + 1}`}
                >
                  {resolvedUrl ? (
                    <img
                      src={resolvedUrl}
                      alt={`Desenho ${idx + 1}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-[10px] text-muted-foreground">
                        Carregando…
                      </span>
                    </div>
                  )}
                </button>

                {/* Botão de excluir */}
                {!disabled && (
                  <button
                    type="button"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDeleteDrawing(d.id)}
                    aria-label={`Remover desenho ${idx + 1}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}

                {/* Número do desenho */}
                <span className="pointer-events-none absolute bottom-1 left-1 rounded bg-black/40 px-1 py-0.5 text-[9px] leading-tight text-white">
                  {idx + 1}
                </span>
              </div>
            );
          })}

          {/* Botão "+" ao final da faixa */}
          {!disabled && (
            <button
              type="button"
              className="flex h-[88px] w-[88px] flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:bg-muted/20"
              onClick={handleAddDrawing}
              aria-label="Adicionar novo desenho"
            >
              <Plus className="h-6 w-6" />
            </button>
          )}
        </div>
      )}

      {/* Modal de edição — tela cheia, renderizado fora do fluxo normal via portal */}
      {activeDrawingId !== null && (
        <DrawingEditorModal
          drawingId={activeDrawingId}
          drawingNumber={
            effectiveDrawings.findIndex((d) => d.id === activeDrawingId) + 1 ||
            effectiveDrawings.length + 1
          }
          isNew={isNewDrawing}
          initialImageUrl={activeDrawingDisplayUrl}
          imageLoading={activeDrawingNeedsResolve}
          templateImageUrl={shouldLoadTemplate ? templateImageUrl : null}
          templateKey={templateKey}
          isDirty={dirtyIds.has(activeDrawingId)}
          disabled={disabled}
          onSave={(base64) => handleSave(activeDrawingId, base64)}
          onDirtyChange={(dirty) => setDirty(activeDrawingId, dirty)}
          onClose={() => setActiveDrawingId(null)}
        />
      )}
    </div>
  );
}
