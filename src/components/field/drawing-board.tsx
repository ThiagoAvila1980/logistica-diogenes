"use client";

import { useRef, useState, useEffect, useCallback } from "react";
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
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canvasToDrawingDataUrl } from "@/lib/upload/canvas-export";
import { Button } from "@/components/ui/button";

const MAX_HISTORY = 15;

type Tool = "pen" | "eraser";

/** Encaixa a imagem no retângulo sem distorcer (equivalente a object-fit: contain). */
function fitImageInRect(
  imgWidth: number,
  imgHeight: number,
  boxWidth: number,
  boxHeight: number,
): { x: number; y: number; width: number; height: number } {
  if (imgWidth <= 0 || imgHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { x: 0, y: 0, width: boxWidth, height: boxHeight };
  }

  const imgAspect = imgWidth / imgHeight;
  const boxAspect = boxWidth / boxHeight;

  let width: number;
  let height: number;

  if (imgAspect > boxAspect) {
    width = boxWidth;
    height = boxWidth / imgAspect;
  } else {
    height = boxHeight;
    width = boxHeight * imgAspect;
  }

  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height,
  };
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const toolRef = useRef<Tool>("pen");
  const strokeColorRef = useRef("#000000");
  const strokeWidthRef = useRef(2);
  const initialLoadedRef = useRef(false);
  const lastTemplateLoadRef = useRef("");
  const disabledRef = useRef(disabled);

  const [tool, setTool] = useState<Tool>("pen");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [historyUI, setHistoryUI] = useState({ canUndo: false, canRedo: false });
  const [savedHint, setSavedHint] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [fullscreen, setFullscreen] = useState(initialFullscreen);
  const [mounted, setMounted] = useState(false);
  const initialFullscreenAppliedRef = useRef(false);

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
    if (!initialFullscreen || initialFullscreenAppliedRef.current) return;
    initialFullscreenAppliedRef.current = true;
    setFullscreen(true);
    onFullscreenChange?.(true);
    onInitialFullscreenApplied?.();
  }, [initialFullscreen, onFullscreenChange, onInitialFullscreenApplied]);

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
    disabledRef.current = disabled ?? false;
  }, [disabled]);

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
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation =
      currentTool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth =
      currentTool === "eraser"
        ? strokeWidthRef.current * 3
        : strokeWidthRef.current;
    // destination-out usa o alpha do traço; "transparent" tem alpha 0 e não apaga nada.
    ctx.strokeStyle =
      currentTool === "eraser" ? "#000000" : strokeColorRef.current;
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
      const parent = containerRef.current;
      if (!canvas || !parent) return;
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
        const fit = fitImageInRect(img.naturalWidth, img.naturalHeight, width, height);

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, fit.x, fit.y, fit.width, fit.height);
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

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const snapshotIndex = historyIndexRef.current;
        setupCanvas();
        if (snapshotIndex >= 0) {
          restoreFromHistory(snapshotIndex);
        }
      }, 120);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [
    setupCanvas,
    saveToHistory,
    initialImageUrl,
    loadInitialImage,
    restoreFromHistory,
  ]);

  useEffect(() => {
    if (!templateImageUrl) return;
    const signature = `${templateKey}:${templateImageUrl}`;
    if (lastTemplateLoadRef.current === signature) return;
    lastTemplateLoadRef.current = signature;
    loadInitialImage(templateImageUrl, () => markDirty());
  }, [templateImageUrl, templateKey, loadInitialImage, markDirty]);

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

  const getPosFromNativeEvent = useCallback(
    (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const point =
        "touches" in e
          ? e.touches[0] ?? e.changedTouches[0]
          : e;
      if (!point) return { x: 0, y: 0 };

      return {
        x: point.clientX - rect.left,
        y: point.clientY - rect.top,
      };
    },
    [],
  );

  const beginStroke = useCallback(
    (x: number, y: number) => {
      isDrawingRef.current = true;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      applyStrokeSettings(ctx);
      ctx.beginPath();
      ctx.moveTo(x, y);
    },
    [applyStrokeSettings],
  );

  const continueStroke = useCallback((x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    canvasRef.current?.getContext("2d")?.closePath();
    saveToHistory();
    markDirty();
  }, [saveToHistory, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (disabledRef.current) return;
      e.preventDefault();
      if (!e.touches[0]) return;
      const { x, y } = getPosFromNativeEvent(e);
      beginStroke(x, y);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDrawingRef.current || disabledRef.current) return;
      e.preventDefault();
      if (!e.touches[0]) return;
      const { x, y } = getPosFromNativeEvent(e);
      continueStroke(x, y);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      endStroke();
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [
    beginStroke,
    continueStroke,
    endStroke,
    fullscreen,
    getPosFromNativeEvent,
    mounted,
  ]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabledRef.current) return;
    const { x, y } = getPosFromNativeEvent(e.nativeEvent);
    beginStroke(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabledRef.current) return;
    const { x, y } = getPosFromNativeEvent(e.nativeEvent);
    continueStroke(x, y);
  };

  const handleMouseUp = () => {
    endStroke();
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

  const rotateCanvas = useCallback(
    (clockwise: boolean) => {
      const canvas = canvasRef.current;
      const parent = containerRef.current;
      if (!canvas || !parent) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const dataUrl = canvas.toDataURL("image/png");

      const snapshot = new Image();
      snapshot.onload = () => {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        const angle = clockwise ? Math.PI / 2 : -Math.PI / 2;
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle);
        ctx.drawImage(snapshot, -width / 2, -height / 2, width, height);
        ctx.restore();
        applyStrokeSettings(ctx);
        saveToHistory();
        markDirty();
      };
      snapshot.src = dataUrl;
    },
    [applyStrokeSettings, saveToHistory, markDirty],
  );

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvasToDrawingDataUrl(canvas));
    markClean();
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  const toolbar = (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-l bg-inverse p-1.5 sm:w-14">
      <ToolbarButton
        onClick={() => {
          setFullscreen((current) => {
            const next = !current;
            onFullscreenChange?.(next);
            return next;
          });
        }}
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

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

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

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

      <ToolbarButton
        onClick={undo}
        disabled={disabled || !historyUI.canUndo}
        title="Desfazer"
      >
        <CornerUpLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={redo}
        disabled={disabled || !historyUI.canRedo}
        title="Refazer"
      >
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

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

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

      <ToolbarButton
        onClick={() => rotateCanvas(false)}
        disabled={disabled}
        title="Girar 90° anti-horário"
      >
        <RotateCcw className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => rotateCanvas(true)}
        disabled={disabled}
        title="Girar 90° horário"
      >
        <RotateCw className="h-4 w-4" />
      </ToolbarButton>

      <div className="my-0.5 h-px w-full bg-inverse-muted" />

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

  // fill e fullscreen usam o mesmo layout interno (flex-1 + h-full no canvas)
  const fillLike = fill || fullscreen;

  const boardInner = (
    <>
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1",
          fillLike ? "min-h-0 h-full" : "min-h-[200px]",
        )}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full touch-none"
          style={{ touchAction: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      {toolbar}
    </>
  );

  const shell = (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-muted/20",
        dirty && !disabled && "border-warning ring-1 ring-warning/40",
        fill && "flex flex-col h-full rounded-none border-0",
        fullscreen && "fixed inset-0 z-[100] flex flex-col rounded-none border-0",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      style={{ touchAction: "none" }}
    >
      <div
        className={cn(
          "flex",
          fillLike ? "min-h-0 flex-1" : "min-h-[200px]",
        )}
      >
        {boardInner}
      </div>

      {dirty && !disabled && !savedHint && (
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
