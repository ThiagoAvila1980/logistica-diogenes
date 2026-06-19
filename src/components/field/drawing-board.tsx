"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CornerUpLeft,
  Eraser,
  Maximize2,
  Minimize2,
  PenLine,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  ScanLine,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDrawingBoard } from "@/lib/drawing/use-drawing-board";

export type DrawingBoardProps = {
  onSave: (base64Image: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  initialImageUrl?: string | null;
  /** Imagem de referência (ex.: tipo de envidraçamento); recarrega quando `templateKey` muda. */
  templateImageUrl?: string | null;
  templateKey?: number;
  initialFullscreen?: boolean;
  onInitialFullscreenApplied?: () => void;
  onFullscreenChange?: (fullscreen: boolean) => void;
  /**
   * Faz o board preencher o container pai (flex-col com altura definida).
   * Use dentro de modais — não ativa o portal/fixed nativo.
   */
  fill?: boolean;
  disabled?: boolean;
  className?: string;
};

export function DrawingBoard({
  onSave,
  onDirtyChange,
  initialImageUrl,
  templateImageUrl,
  templateKey = 0,
  initialFullscreen = false,
  onInitialFullscreenApplied,
  onFullscreenChange,
  fill = false,
  disabled,
  className,
}: DrawingBoardProps) {
  const [fullscreen, setFullscreen] = useState(initialFullscreen);
  const [mounted, setMounted] = useState(false);
  const initialFullscreenAppliedRef = useRef(false);

  // ---- Rastrear quais recursos já foram carregados para não recarregar ----
  const initialLoadedRef = useRef(false);
  const lastTemplateLoadRef = useRef("");

  const board = useDrawingBoard({ disabled, onDirtyChange });
  const [savedHint, setSavedHint] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Aplica fullscreen inicial uma única vez
  useEffect(() => {
    if (!initialFullscreen || initialFullscreenAppliedRef.current) return;
    initialFullscreenAppliedRef.current = true;
    setFullscreen(true);
    onFullscreenChange?.(true);
    onInitialFullscreenApplied?.();
  }, [initialFullscreen, onFullscreenChange, onInitialFullscreenApplied]);

  // Lock de scroll quando fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [fullscreen]);

  // Força recálculo do viewport após transição fullscreen
  // (o portal muda o layout; o ResizeObserver pode não disparar no frame certo)
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => board.refresh());
    return () => cancelAnimationFrame(id);
  // board.refresh é estável (useCallback com deps vazias via recalcView)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, mounted]);

  // Carrega initialImageUrl como background (apenas uma vez)
  useEffect(() => {
    if (!initialImageUrl || initialLoadedRef.current) return;
    initialLoadedRef.current = true;
    board.loadBackground(initialImageUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialImageUrl]);

  // Carrega template quando muda
  useEffect(() => {
    if (!templateImageUrl) return;
    const sig = `${templateKey}:${templateImageUrl}`;
    if (lastTemplateLoadRef.current === sig) return;
    lastTemplateLoadRef.current = sig;
    board.loadBackground(templateImageUrl, () => {
      onDirtyChange?.(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateImageUrl, templateKey]);

  function toggleFullscreen() {
    setFullscreen((cur) => {
      const next = !cur;
      onFullscreenChange?.(next);
      return next;
    });
  }

  function handleSaveClick() {
    board.handleSave(onSave);
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  }

  // ---- toolbar ----
  const toolbar = (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-l bg-inverse p-1.5 sm:w-14">
      {/* Fullscreen só faz sentido fora do fill (que já é usado dentro de modais fullscreen) */}
      {!fill && (
        <ToolbarButton
          onClick={toggleFullscreen}
          title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
          disabled={disabled}
          active={fullscreen}
        >
          {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </ToolbarButton>
      )}

      <ToolbarButton
        onClick={board.fitToScreen}
        title="Ajustar à tela (resetar zoom)"
        disabled={disabled || board.zoom === 1}
        active={board.zoom !== 1}
      >
        <ScanLine className="h-4 w-4" />
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

      <ToolbarButton
        active={board.tool === "pen"}
        onClick={() => board.setTool("pen")}
        title="Caneta"
        disabled={disabled}
      >
        <PenLine className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={board.tool === "eraser"}
        onClick={() => board.setTool("eraser")}
        title="Borracha"
        disabled={disabled}
      >
        <Eraser className="h-4 w-4" />
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

      <ToolbarButton
        onClick={board.undo}
        disabled={disabled || !board.canUndo}
        title="Desfazer"
      >
        <CornerUpLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={board.redo}
        disabled={disabled || !board.canRedo}
        title="Refazer"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

      <label className="cursor-pointer" title="Cor" aria-label="Cor do traço">
        <input
          type="color"
          value={board.strokeColor}
          onChange={(e) => board.setStrokeColor(e.target.value)}
          disabled={disabled}
          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </label>

      <input
        type="range"
        min={1}
        max={20}
        value={board.strokeWidth}
        onChange={(e) => board.setStrokeWidth(Number(e.target.value))}
        disabled={disabled}
        title="Espessura"
        aria-label="Espessura do traço"
        className="h-16 w-8 accent-primary [writing-mode:vertical-lr]"
      />

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

      <ToolbarButton
        onClick={() => board.rotate90(false)}
        disabled={disabled}
        title="Girar 90° anti-horário"
      >
        <RotateCcw className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => board.rotate90(true)}
        disabled={disabled}
        title="Girar 90° horário"
      >
        <RotateCw className="h-4 w-4" />
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

      <ToolbarButton onClick={board.clearDoc} disabled={disabled} title="Limpar">
        <Trash2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={handleSaveClick}
        disabled={disabled}
        title="Salvar desenho"
        active={savedHint}
      >
        <Save className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );

  const fillLike = fill || fullscreen;

  const boardInner = (
    <>
      <div
        ref={board.containerRef}
        className={cn(
          "relative flex-1 overflow-hidden",
          fillLike ? "min-h-0 h-full" : "min-h-[200px]",
        )}
      >
        <canvas
          ref={board.canvasRef}
          className="block h-full w-full touch-none"
          style={{ touchAction: "none" }}
        />
        {/* Dica de zoom flutuante */}
        {board.zoom > 1 && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white">
            {Math.round(board.zoom * 100)}%
          </div>
        )}
      </div>
      {toolbar}
    </>
  );

  const shell = (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-muted/20",
        board.dirty && !disabled && "border-warning ring-1 ring-warning/40",
        fill && "flex flex-col h-full rounded-none border-0",
        fullscreen && "fixed inset-0 z-[300] flex flex-col rounded-none border-0",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <div className={cn("flex", fillLike ? "min-h-0 flex-1" : "min-h-[200px]")}>
        {boardInner}
      </div>

      {board.dirty && !disabled && !savedHint && (
        <p className="shrink-0 border-t bg-warning-muted px-3 py-1.5 text-center text-xs font-medium text-warning-foreground">
          Desenho alterado — toque em Salvar na barra lateral
        </p>
      )}
      {savedHint && (
        <p className="shrink-0 border-t bg-primary/10 px-3 py-1.5 text-center text-xs text-primary">
          Desenho salvo nesta medição
        </p>
      )}
    </div>
  );

  if (fullscreen && mounted) {
    return createPortal(shell, document.body);
  }

  return shell;
}

// ---------------------------------------------------------------------------
// ToolbarButton
// ---------------------------------------------------------------------------

function ToolbarButton({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-9 w-9 text-inverse-foreground hover:bg-inverse-muted hover:text-inverse-foreground",
        active && "bg-primary text-primary-foreground hover:bg-primary/90",
        disabled && "opacity-30",
      )}
    >
      {children}
    </Button>
  );
}
