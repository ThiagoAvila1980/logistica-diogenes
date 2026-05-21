"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Eraser,
  Maximize2,
  Minimize2,
  PenLine,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canvasToDrawingDataUrl } from "@/lib/upload/canvas-export";
import { Button } from "@/components/ui/button";

const MAX_HISTORY = 15;

type Tool = "pen" | "eraser";

export type DrawingBoardProps = {
  onSave: (base64Image: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  initialImageUrl?: string | null;
  disabled?: boolean;
  className?: string;
};

export function DrawingBoard({
  onSave,
  onDirtyChange,
  initialImageUrl,
  disabled,
  className,
}: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const toolRef = useRef<Tool>("pen");
  const strokeColorRef = useRef("#000000");
  const strokeWidthRef = useRef(4);
  const initialLoadedRef = useRef(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [historyUI, setHistoryUI] = useState({ canUndo: false, canRedo: false });
  const [savedHint, setSavedHint] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const setDirtyState = useCallback(
    (next: boolean) => {
      setDirty(next);
      onDirtyChange?.(next);
    },
    [onDirtyChange],
  );

  const markDirty = useCallback(() => {
    setDirtyState(true);
  }, [setDirtyState]);

  const markClean = useCallback(() => {
    setDirtyState(false);
  }, [setDirtyState]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    strokeColorRef.current = strokeColor;
  }, [strokeColor]);

  useEffect(() => {
    strokeWidthRef.current = strokeWidth;
  }, [strokeWidth]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const applyStrokeSettings = useCallback((ctx: CanvasRenderingContext2D) => {
    const currentTool = toolRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation =
      currentTool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth =
      currentTool === "eraser"
        ? strokeWidthRef.current * 3
        : strokeWidthRef.current;
    ctx.strokeStyle =
      currentTool === "eraser" ? "transparent" : strokeColorRef.current;
  }, []);

  const syncHistoryUi = useCallback(() => {
    setHistoryUI({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    const currentHistory = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    currentHistory.push(dataUrl);
    if (currentHistory.length > MAX_HISTORY) currentHistory.shift();

    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
    syncHistoryUi();
  }, [syncHistoryUi]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const parent = containerRef.current;
    if (!canvas || !parent) return;

    const dpr = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    applyStrokeSettings(ctx);
  }, [applyStrokeSettings]);

  const restoreFromHistory = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        applyStrokeSettings(ctx);
      };
      img.src = historyRef.current[index]!;
    },
    [applyStrokeSettings],
  );

  const loadInitialImage = useCallback(
    (url: string, onDone?: () => void) => {
      const canvas = canvasRef.current;
      const parent = containerRef.current;
      if (!canvas || !parent) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const width = parent.clientWidth;
        const height = parent.clientHeight;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        ctx.restore();
        applyStrokeSettings(ctx);
        saveToHistory();
        onDone?.();
      };
      img.onerror = () => {
        saveToHistory();
        onDone?.();
      };
      img.src = url;
    },
    [applyStrokeSettings, saveToHistory],
  );

  useEffect(() => {
    setupCanvas();
    if (initialImageUrl && !initialLoadedRef.current) {
      initialLoadedRef.current = true;
      loadInitialImage(initialImageUrl);
    } else {
      saveToHistory();
    }

    const handleResize = () => {
      setupCanvas();
      if (historyIndexRef.current >= 0) {
        restoreFromHistory(historyIndexRef.current);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    setupCanvas,
    saveToHistory,
    initialImageUrl,
    loadInitialImage,
    restoreFromHistory,
  ]);

  useEffect(() => {
    if (!mounted) return;
    const id = window.requestAnimationFrame(() => {
      setupCanvas();
      if (historyIndexRef.current >= 0) {
        restoreFromHistory(historyIndexRef.current);
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [fullscreen, mounted, setupCanvas, restoreFromHistory]);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    applyStrokeSettings(ctx);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || disabled) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    canvasRef.current?.getContext("2d")?.closePath();
    saveToHistory();
    markDirty();
  };

  const undo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      restoreFromHistory(historyIndexRef.current);
      syncHistoryUi();
      markDirty();
    }
  };

  const redo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      restoreFromHistory(historyIndexRef.current);
      syncHistoryUi();
      markDirty();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const parent = containerRef.current;
    if (!canvas || !parent) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, parent.clientWidth, parent.clientHeight);
    ctx.restore();
    applyStrokeSettings(ctx);
    saveToHistory();
    markDirty();
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvasToDrawingDataUrl(canvas));
    markClean();
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  const toolbar = (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-l bg-slate-800 p-1.5 sm:w-14">
      <ToolbarButton
        onClick={() => setFullscreen((f) => !f)}
        title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
        disabled={disabled}
        active={fullscreen}
      >
        {fullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-slate-600" />

      <ToolbarButton
        active={tool === "pen"}
        onClick={() => setTool("pen")}
        title="Caneta"
        disabled={disabled}
      >
        <PenLine className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={tool === "eraser"}
        onClick={() => setTool("eraser")}
        title="Borracha"
        disabled={disabled}
      >
        <Eraser className="h-4 w-4" />
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-slate-600" />

      <label
        className="cursor-pointer"
        title="Cor"
        aria-label="Cor do traço"
      >
        <input
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          disabled={disabled}
          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
        />
      </label>

      <input
        type="range"
        min={1}
        max={20}
        value={strokeWidth}
        onChange={(e) => setStrokeWidth(Number(e.target.value))}
        disabled={disabled}
        title="Espessura"
        aria-label="Espessura do traço"
        className="h-16 w-8 accent-primary [writing-mode:vertical-lr]"
      />

      <div className="my-0.5 h-px w-full bg-slate-600" />

      <ToolbarButton
        onClick={undo}
        disabled={disabled || !historyUI.canUndo}
        title="Desfazer"
      >
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={redo}
        disabled={disabled || !historyUI.canRedo}
        title="Refazer"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={clearCanvas}
        disabled={disabled}
        title="Limpar"
      >
        <Trash2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={saveCanvas}
        disabled={disabled}
        title="Salvar desenho"
        active={savedHint}
      >
        <Save className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );

  const boardInner = (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1",
          fullscreen ? "min-h-0 h-full" : "min-h-[200px]",
        )}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          style={{ touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      {toolbar}
    </>
  );

  const shell = (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-muted/20",
        dirty && !disabled && "border-amber-500 ring-1 ring-amber-500/40",
        fullscreen && "fixed inset-0 z-[100] flex flex-col rounded-none border-0",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      style={{ touchAction: "none" }}
    >
      <div
        className={cn(
          "flex",
          fullscreen ? "min-h-0 flex-1" : "min-h-[200px]",
        )}
      >
        {boardInner}
      </div>

      {dirty && !disabled && !savedHint && (
        <p className="shrink-0 border-t bg-amber-500/10 px-3 py-1.5 text-center text-xs font-medium text-amber-800 dark:text-amber-200">
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
        "h-9 w-9 text-white hover:bg-slate-700 hover:text-white",
        active && "bg-primary text-primary-foreground hover:bg-primary/90",
        disabled && "opacity-30",
      )}
    >
      {children}
    </Button>
  );
}
