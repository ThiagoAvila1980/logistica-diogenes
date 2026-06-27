"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import type {
  DrawingDocument,
  HistoryEntry,
  Point,
  Stroke,
  Tool,
  ViewTransform,
} from "./types";
import { DOC_LONG_SIDE, DOC_SHORT_SIDE } from "./types";
import {
  computeFit,
  exportDocument,
  renderScene,
  rotateDocument,
  viewportToDoc,
} from "./render";

// ---------------------------------------------------------------------------
// Tipos públicos do hook
// ---------------------------------------------------------------------------

export type UseDrawingBoardOptions = {
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export type UseDrawingBoardReturn = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;

  tool: Tool;
  setTool: (t: Tool) => void;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;

  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  clearDoc: () => void;
  rotate90: (clockwise: boolean) => void;
  loadBackground: (url: string, onDone?: () => void) => void;

  /** Ajusta zoom para encaixar o documento inteiro na tela */
  fitToScreen: () => void;
  zoom: number;

  /**
   * Força recálculo do viewport sem alterar zoom/pan.
   * Use após mudanças de layout externas (ex.: transição fullscreen).
   */
  refresh: () => void;

  dirty: boolean;

  exportImage: () => string;

  /** Chama onSave e marca clean */
  handleSave: (onSave: (b64: string) => void) => void;
};

const MAX_HISTORY = 30;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDrawingBoard(
  opts: UseDrawingBoardOptions = {},
): UseDrawingBoardReturn {
  const { disabled, onDirtyChange } = opts;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ---- Documento vetorial (mutável via ref para evitar re-renders no draw loop) ----
  const docRef = useRef<DrawingDocument>({
    width: DOC_SHORT_SIDE,
    height: DOC_LONG_SIDE,
    background: null,
    strokes: [],
  });

  // ---- Histórico (apenas strokes) ----
  const historyRef = useRef<HistoryEntry[]>([[]]);
  const historyIndexRef = useRef(0);

  // ---- View transform ----
  const viewRef = useRef<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef<Point>({ x: 0, y: 0 });

  // ---- Estado atual do stroke em andamento ----
  const activeStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);

  // ---- Detectar caneta ativa para rejeitar palma ----
  const penActiveRef = useRef(false);

  // ---- Gesture (pinch/pan) ----
  const gestureRef = useRef<{
    type: "none" | "pinch" | "pan";
    prevDist: number;
    prevMidX: number;
    prevMidY: number;
    startZoom: number;
    startPanX: number;
    startPanY: number;
    pointersDown: Map<number, PointerEvent>;
  }>({
    type: "none",
    prevDist: 0,
    prevMidX: 0,
    prevMidY: 0,
    startZoom: 1,
    startPanX: 0,
    startPanY: 0,
    pointersDown: new Map(),
  });

  // ---- rAF para evitar renders desnecessários ----
  const rafRef = useRef<number | null>(null);

  // ---- UI state ----
  const [tool, setToolState] = useState<Tool>("pen");
  const toolRef = useRef<Tool>("pen");
  const [strokeColor, setColorState] = useState("#000000");
  const colorRef = useRef("#000000");
  const [strokeWidth, setWidthState] = useState(3);
  const widthRef = useRef(3);
  const [historyUI, setHistoryUI] = useState({ canUndo: false, canRedo: false });
  const [dirty, setDirtyState] = useState(false);
  const dirtyRef = useRef(false);
  const [zoom, setZoomState] = useState(1);

  // ---- sync refs ----
  const disabledRef = useRef(disabled ?? false);
  useEffect(() => { disabledRef.current = disabled ?? false; }, [disabled]);
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => { onDirtyChangeRef.current = onDirtyChange; }, [onDirtyChange]);

  // ---- Setters que sincronizam ref + state ----
  const setTool = useCallback((t: Tool) => {
    toolRef.current = t;
    setToolState(t);
  }, []);

  const setStrokeColor = useCallback((c: string) => {
    colorRef.current = c;
    setColorState(c);
  }, []);

  const setStrokeWidth = useCallback((w: number) => {
    widthRef.current = w;
    setWidthState(w);
  }, []);

  // ---------------------------------------------------------------------------
  // Render loop — sempre inclui o stroke ativo se houver (preview ao vivo)
  // ---------------------------------------------------------------------------

  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) {
      // Já há um frame agendado; quando ele rodar, vai ler activeStrokeRef.current
      return;
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const boxW = container.clientWidth;
      const boxH = container.clientHeight;
      if (boxW <= 0 || boxH <= 0) return;

      // Redimensiona o canvas físico se necessário
      const physW = Math.round(boxW * dpr);
      const physH = Math.round(boxH * dpr);
      if (canvas.width !== physW || canvas.height !== physH) {
        canvas.width = physW;
        canvas.height = physH;
        canvas.style.width = `${boxW}px`;
        canvas.style.height = `${boxH}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Inclui o stroke ativo (preview em tempo real)
      const active = activeStrokeRef.current;
      const doc = active
        ? { ...docRef.current, strokes: [...docRef.current.strokes, active] }
        : docRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderScene(ctx, doc, viewRef.current, boxW, boxH);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Recalcular fit (chamado pelo ResizeObserver e ao mudar zoom/pan)
  // ---------------------------------------------------------------------------

  const recalcView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { clientWidth: bw, clientHeight: bh } = container;
    const { width: dw, height: dh } = docRef.current;
    viewRef.current = computeFit(dw, dh, bw, bh, zoomRef.current, panRef.current.x, panRef.current.y);
    scheduleRender();
  }, [scheduleRender]);

  // ---------------------------------------------------------------------------
  // ResizeObserver
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      recalcView();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [recalcView]);

  // ---------------------------------------------------------------------------
  // Dirty helpers
  // ---------------------------------------------------------------------------

  const markDirty = useCallback(() => {
    if (!dirtyRef.current) {
      dirtyRef.current = true;
      setDirtyState(true);
      onDirtyChangeRef.current?.(true);
    }
  }, []);

  const markClean = useCallback(() => {
    dirtyRef.current = false;
    setDirtyState(false);
    onDirtyChangeRef.current?.(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Histórico vetorial
  // ---------------------------------------------------------------------------

  const syncHistoryUI = useCallback(() => {
    setHistoryUI({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const saveToHistory = useCallback(() => {
    const current = historyRef.current.slice(0, historyIndexRef.current + 1);
    current.push([...docRef.current.strokes]);
    if (current.length > MAX_HISTORY) current.shift();
    historyRef.current = current;
    historyIndexRef.current = current.length - 1;
    syncHistoryUI();
  }, [syncHistoryUI]);

  const restoreHistory = useCallback((index: number) => {
    const entry = historyRef.current[index];
    if (!entry) return;
    docRef.current = { ...docRef.current, strokes: [...entry] };
    recalcView();
  }, [recalcView]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      restoreHistory(historyIndexRef.current);
      syncHistoryUI();
      markDirty();
    }
  }, [restoreHistory, syncHistoryUI, markDirty]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      restoreHistory(historyIndexRef.current);
      syncHistoryUI();
      markDirty();
    }
  }, [restoreHistory, syncHistoryUI, markDirty]);

  // ---------------------------------------------------------------------------
  // Operações de documento
  // ---------------------------------------------------------------------------

  const clearDoc = useCallback(() => {
    const container = containerRef.current;
    let docW = docRef.current.width;
    let docH = docRef.current.height;

    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
      const aspect = container.clientWidth / container.clientHeight;
      if (aspect >= 1) {
        docW = DOC_LONG_SIDE;
        docH = Math.round(DOC_LONG_SIDE / aspect);
      } else {
        docH = DOC_LONG_SIDE;
        docW = Math.round(DOC_LONG_SIDE * aspect);
      }
    }

    docRef.current = {
      width: docW,
      height: docH,
      background: null,
      strokes: [],
    };
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoomState(1);
    saveToHistory();
    markDirty();
    recalcView();
  }, [saveToHistory, markDirty, recalcView]);

  const rotate90 = useCallback((clockwise: boolean) => {
    docRef.current = rotateDocument(docRef.current, clockwise);
    // Após rotacionar o documento, resetar zoom/pan para encaixar novamente
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoomState(1);
    saveToHistory();
    markDirty();
    recalcView();
  }, [saveToHistory, markDirty, recalcView]);

  const fitToScreen = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoomState(1);
    recalcView();
  }, [recalcView]);

  const loadBackground = useCallback((url: string, onDone?: () => void) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Ajusta proporção do documento para a da imagem de referência
      const aspect = img.naturalWidth / img.naturalHeight;
      let docW: number, docH: number;
      if (aspect >= 1) {
        docW = DOC_LONG_SIDE;
        docH = Math.round(DOC_LONG_SIDE / aspect);
      } else {
        docH = DOC_LONG_SIDE;
        docW = Math.round(DOC_LONG_SIDE * aspect);
      }
      docRef.current = {
        ...docRef.current,
        width: docW,
        height: docH,
        background: img,
        strokes: [],
      };
      historyRef.current = [[]];
      historyIndexRef.current = 0;
      syncHistoryUI();
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      setZoomState(1);
      recalcView();
      onDone?.();
    };
    img.onerror = () => {
      recalcView();
      onDone?.();
    };
    img.src = url;
  }, [recalcView, syncHistoryUI]);

  const exportImage = useCallback(() => {
    return exportDocument(docRef.current);
  }, []);

  const handleSave = useCallback((onSave: (b64: string) => void) => {
    onSave(exportDocument(docRef.current));
    markClean();
  }, [markClean]);

  // ---------------------------------------------------------------------------
  // Pointer events — desenho e gesture
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPoint(e: PointerEvent): Point {
      const rect = canvas!.getBoundingClientRect();
      return viewportToDoc(e.clientX - rect.left, e.clientY - rect.top, viewRef.current);
    }

    function onPointerDown(e: PointerEvent) {
      if (disabledRef.current) return;
      const g = gestureRef.current;
      g.pointersDown.set(e.pointerId, e);
      canvas!.setPointerCapture(e.pointerId);

      // Se caneta/stylus, rejeita todos os outros pointers
      if (e.pointerType === "pen") {
        penActiveRef.current = true;
      }

      const count = g.pointersDown.size;

      // 2+ pointers → gesture (pinch/pan)
      if (count >= 2) {
        // Cancela traço ativo
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          activeStrokeRef.current = null;
        }
        startGesture();
        return;
      }

      // 1 pointer de toque quando caneta ativa → rejeita palma
      if (e.pointerType === "touch" && penActiveRef.current) return;

      // Início do traço
      isDrawingRef.current = true;
      const pt = getCanvasPoint(e);
      activeStrokeRef.current = {
        tool: toolRef.current,
        color: colorRef.current,
        width: toolRef.current === "eraser" ? widthRef.current * 3 : widthRef.current,
        points: [pt],
      };
    }

    function startGesture() {
      const g = gestureRef.current;
      const pts = Array.from(g.pointersDown.values());
      if (pts.length < 2) return;
      const [a, b] = [pts[0]!, pts[1]!];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      g.type = "pinch";
      g.prevDist = dist;
      g.prevMidX = (a.clientX + b.clientX) / 2;
      g.prevMidY = (a.clientY + b.clientY) / 2;
      g.startZoom = zoomRef.current;
      g.startPanX = panRef.current.x;
      g.startPanY = panRef.current.y;
    }

    function onPointerMove(e: PointerEvent) {
      if (disabledRef.current) return;
      const g = gestureRef.current;
      g.pointersDown.set(e.pointerId, e);

      // Gesture com 2+ pointers
      if (g.pointersDown.size >= 2 && g.type === "pinch") {
        const pts = Array.from(g.pointersDown.values());
        const [a, b] = [pts[0]!, pts[1]!];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const midX = (a.clientX + b.clientX) / 2;
        const midY = (a.clientY + b.clientY) / 2;

        // Zoom proporcional
        if (g.prevDist > 0) {
          const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * (dist / g.prevDist)));
          zoomRef.current = newZoom;
          setZoomState(newZoom);
        }

        // Pan pelo delta do midpoint
        const dxMid = midX - g.prevMidX;
        const dyMid = midY - g.prevMidY;
        panRef.current = { x: panRef.current.x + dxMid, y: panRef.current.y + dyMid };

        g.prevDist = dist;
        g.prevMidX = midX;
        g.prevMidY = midY;

        recalcView();
        return;
      }

      // Traço
      if (!isDrawingRef.current || !activeStrokeRef.current) return;

      // Usa coalescedEvents para maior suavidade
      const events: PointerEvent[] =
        (e as PointerEvent & { getCoalescedEvents?: () => PointerEvent[] })
          .getCoalescedEvents?.() ?? [e];

      const canvas_ = canvas!;
      const rect = canvas_.getBoundingClientRect();
      for (const ev of events) {
        const pt = viewportToDoc(ev.clientX - rect.left, ev.clientY - rect.top, viewRef.current);
        activeStrokeRef.current.points.push(pt);
      }

      // Live preview: scheduleRender já inclui activeStrokeRef
      scheduleRender();
    }

    function onPointerUp(e: PointerEvent) {
      const g = gestureRef.current;
      g.pointersDown.delete(e.pointerId);

      if (e.pointerType === "pen") {
        penActiveRef.current = g.pointersDown.size > 0;
      }

      if (g.pointersDown.size < 2) {
        g.type = "none";
        g.prevDist = 0;
      }

      if (!isDrawingRef.current || !activeStrokeRef.current) return;
      isDrawingRef.current = false;

      const stroke = activeStrokeRef.current;
      activeStrokeRef.current = null;

      if (stroke.points.length > 1) {
        docRef.current = {
          ...docRef.current,
          strokes: [...docRef.current.strokes, stroke],
        };
        saveToHistory();
        markDirty();
      }
      scheduleRender();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
    // recalcView e scheduleRender não mudam; saveToHistory e markDirty são estáveis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ---------------------------------------------------------------------------
  // Inicialização do documento padrão (proporção do container)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Roda uma vez após o mount para definir a proporção inicial
    const container = containerRef.current;
    if (!container) return;

    const id = requestAnimationFrame(() => {
      const { clientWidth: bw, clientHeight: bh } = container;
      if (bw <= 0 || bh <= 0) return;

      const aspect = bw / bh;
      let docW: number, docH: number;
      if (aspect >= 1) {
        docW = DOC_LONG_SIDE;
        docH = Math.round(DOC_LONG_SIDE / aspect);
      } else {
        docH = DOC_LONG_SIDE;
        docW = Math.round(DOC_LONG_SIDE * aspect);
      }

      if (docRef.current.background === null) {
        docRef.current = { ...docRef.current, width: docW, height: docH };
        historyRef.current = [[]];
        historyIndexRef.current = 0;
        syncHistoryUI();
      }
      recalcView();
    });
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    canvasRef,
    containerRef,
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    canUndo: historyUI.canUndo,
    canRedo: historyUI.canRedo,
    undo,
    redo,
    clearDoc,
    rotate90,
    loadBackground,
    fitToScreen,
    refresh: recalcView,
    zoom,
    dirty,
    exportImage,
    handleSave,
  };
}
