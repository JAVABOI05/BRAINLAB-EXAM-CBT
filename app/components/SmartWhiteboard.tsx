/* eslint @typescript-eslint/no-explicit-any: "off", react/no-unescaped-entities: "off" */
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { toast } from "../lib/toast";

export interface WhiteboardElement {
  id: string;
  type: "pen" | "highlighter" | "line" | "arrow" | "rect" | "circle" | "text" | "eraser";
  color: string;
  width: number;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

export type BoardAspectRatio = "16 / 9" | "4 / 3" | "9 / 16" | "free";

export interface WhiteboardPage {
  id: string;
  title: string;
  elements: WhiteboardElement[];
  aspectRatio: BoardAspectRatio;
  backgroundImage?: string;
  backgroundMode?: "blackboard" | "whiteboard" | "grid" | "lines";
}

export interface SmartWhiteboardProps {
  classId: string;
  isHost: boolean;
  canDraw?: boolean;
  channel?: any;
  currentUserName?: string;
  currentUserId?: string;
  onShareToChat?: (dataUrl: string) => void;
  showWatermark?: boolean;
  initialPages?: WhiteboardPage[];
  initialActivePageIndex?: number;
  onPagesChange?: (pages: WhiteboardPage[], activePageIndex: number) => void;
  readOnly?: boolean;
}

export interface SmartWhiteboardHandle {
  getCanvasDataUrl: () => string | null;
  getCanvasElement: () => HTMLCanvasElement | null;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  downloadImage: () => void;
  addPage: (title?: string, background?: string) => void;
  duplicateCurrentPage: () => void;
  deleteCurrentPage: () => void;
  nextPage: () => void;
  prevPage: () => void;
  setActivePage: (index: number) => void;
}

const PRESET_COLORS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Coral", value: "#ff5238" }, // BrainLab Coral
  { name: "Purple", value: "#a855f7" },
  { name: "White", value: "#ffffff" },
  { name: "Yellow", value: "#facc15" },
  { name: "Dark", value: "#0b1536" }, // BrainLab Navy
];

const STROKE_WIDTHS = [
  { label: "Fine", value: 2 },
  { label: "Normal", value: 4 },
  { label: "Thick", value: 8 },
  { label: "Jumbo", value: 16 },
];

const MATH_SYMBOLS = [
  "π", "θ", "α", "β", "λ", "μ", "Δ", "Ω", "∞", "√", "∫", "∑", "±", "×", "÷", "≠", "≤", "≥", "≈", "°", "²", "³"
];

export const SmartWhiteboard = forwardRef<SmartWhiteboardHandle, SmartWhiteboardProps>(
  (
    {
      classId,
      isHost,
      canDraw = true,
      channel,
      currentUserName = "Learner",
      currentUserId = "user",
      onShareToChat,
      showWatermark = true,
      initialPages,
      initialActivePageIndex = 0,
      onPagesChange,
      readOnly = false,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const boardSurfaceRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Active tool state
    const [tool, setTool] = useState<
      "pen" | "highlighter" | "line" | "arrow" | "rect" | "circle" | "text" | "eraser" | "laser"
    >("pen");
    const [color, setColor] = useState<string>("#06b6d4");
    const [strokeWidth, setStrokeWidth] = useState<number>(4);
    const [backgroundMode, setBackgroundMode] = useState<"blackboard" | "whiteboard" | "grid" | "lines">("blackboard");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState<number>(1);

    // Panels visibility (Responsive)
    const [showPagesDrawer, setShowPagesDrawer] = useState(false);
    const [showToolsDrawer, setShowToolsDrawer] = useState(false);
    const [showPropertiesDrawer, setShowPropertiesDrawer] = useState(false);

    // Authoritative pages collection
    const [pages, setPages] = useState<WhiteboardPage[]>(() => {
      if (initialPages && initialPages.length > 0) return initialPages;
      return [{ id: "page-1", title: "Page 1", elements: [], aspectRatio: "16 / 9", backgroundMode: "blackboard" }];
    });
    const [activePageIndex, setActivePageIndex] = useState(initialActivePageIndex);

    // Sync authoritative pages when parent updates (fixes Parent-Child state desync)
    const lastInitialPagesRef = useRef<string>("");
    useEffect(() => {
      if (initialPages && initialPages.length > 0) {
        const serialized = JSON.stringify(initialPages);
        if (serialized !== lastInitialPagesRef.current) {
          lastInitialPagesRef.current = serialized;
          setPages(initialPages);
          if (initialActivePageIndex !== undefined && initialActivePageIndex < initialPages.length) {
            setActivePageIndex(initialActivePageIndex);
          }
        }
      }
    }, [initialPages, initialActivePageIndex]);

    const activePage = pages[activePageIndex] || pages[0] || {
      id: "page-1",
      title: "Page 1",
      elements: [],
      aspectRatio: "16 / 9" as BoardAspectRatio,
      backgroundMode: "blackboard" as const,
    };

    const boardAspectRatio = activePage?.aspectRatio || "16 / 9";

    // Text annotation modal
    const [textPromptOpen, setTextPromptOpen] = useState(false);
    const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
    const [textInput, setTextInput] = useState("");
    const [textFontSize, setTextFontSize] = useState<number>(22);

    // Elements of active page
    const elements = activePage?.elements || [];
    const elementsRef = useRef<WhiteboardElement[]>(elements);
    useEffect(() => {
      elementsRef.current = elements;
    }, [elements]);

    const [redoStack, setRedoStack] = useState<WhiteboardElement[]>([]);
    const imageCacheRef = useRef<Record<string, HTMLImageElement>>({});

    // Notify parent whenever pages change
    const updatePagesAndNotify = useCallback(
      (updater: (prev: WhiteboardPage[]) => WhiteboardPage[], nextActiveIndex?: number) => {
        setPages((prev) => {
          const next = updater(prev);
          const targetIndex = nextActiveIndex !== undefined ? nextActiveIndex : activePageIndex;
          onPagesChange?.(next, targetIndex);
          return next;
        });
        if (nextActiveIndex !== undefined) {
          setActivePageIndex(nextActiveIndex);
        }
      },
      [activePageIndex, onPagesChange]
    );

    const setElements = useCallback(
      (action: React.SetStateAction<WhiteboardElement[]>) => {
        updatePagesAndNotify((prev) =>
          prev.map((page, idx) => {
            if (idx !== activePageIndex) return page;
            const nextElements = typeof action === "function" ? action(page.elements) : action;
            return { ...page, elements: nextElements };
          })
        );
      },
      [activePageIndex, updatePagesAndNotify]
    );

    // ------------------------------------------------------------------------
    // MANDATORY LASER POINTER ✍️ WITH ANIMATED FADING GLOWING TRAIL
    // ------------------------------------------------------------------------
    interface LaserTrailPoint {
      x: number;
      y: number;
      timestamp: number;
      color: string;
    }
    const laserTrailRef = useRef<LaserTrailPoint[]>([]);
    const [currentLaserPoint, setCurrentLaserPoint] = useState<{ x: number; y: number; color: string } | null>(null);
    const laserAnimFrameRef = useRef<number | null>(null);
    const laserLastSendRef = useRef<number>(0);

    const addLaserPoint = useCallback((x: number, y: number, ptColor: string) => {
      const now = Date.now();
      laserTrailRef.current.push({ x, y, timestamp: now, color: ptColor });
      setCurrentLaserPoint({ x, y, color: ptColor });

      // Throttle broadcast to LiveKit data channel / Supabase broadcast channel (max 25fps)
      if (channel && now - laserLastSendRef.current > 40) {
        laserLastSendRef.current = now;
        try {
          channel.send({
            type: "broadcast",
            event: "whiteboard_laser",
            payload: { x, y, color: ptColor, active: true, senderId: currentUserId },
          });
        } catch {
          // Non-blocking
        }
      }
    }, [channel, currentUserId]);

    const clearLaser = useCallback(() => {
      setCurrentLaserPoint(null);
      if (channel) {
        try {
          channel.send({
            type: "broadcast",
            event: "whiteboard_laser",
            payload: { active: false, senderId: currentUserId },
          });
        } catch {
          // Non-blocking
        }
      }
    }, [channel, currentUserId]);

    // Remote laser listener
    useEffect(() => {
      if (!channel) return;
      const handleRemoteLaser = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (payload.active && typeof payload.x === "number" && typeof payload.y === "number") {
          const ptColor = payload.color || "#ff5238";
          laserTrailRef.current.push({ x: payload.x, y: payload.y, timestamp: Date.now(), color: ptColor });
          setCurrentLaserPoint({ x: payload.x, y: payload.y, color: ptColor });
        } else {
          setCurrentLaserPoint(null);
        }
      };

      channel.on?.("broadcast", { event: "whiteboard_laser" }, handleRemoteLaser);
      return () => {
        channel.off?.("broadcast", { event: "whiteboard_laser" }, handleRemoteLaser);
      };
    }, [channel, currentUserId]);

    // Continuous Laser Trail Animation Loop (draws directly onto the canvas for recording capture)
    useEffect(() => {
      let isRunning = true;

      const loop = () => {
        if (!isRunning) return;
        const now = Date.now();
        const trail = laserTrailRef.current;

        // Prune points older than 1100ms
        const filtered = trail.filter((p) => now - p.timestamp < 1100);
        laserTrailRef.current = filtered;

        if (filtered.length > 0 || currentLaserPoint) {
          redrawCanvas();
        }

        laserAnimFrameRef.current = requestAnimationFrame(loop);
      };

      laserAnimFrameRef.current = requestAnimationFrame(loop);
      return () => {
        isRunning = false;
        if (laserAnimFrameRef.current) cancelAnimationFrame(laserAnimFrameRef.current);
      };
    }, [currentLaserPoint]);

    // ------------------------------------------------------------------------
    // CANVAS RESIZE & DRAWING RENDERING ENGINE
    // ------------------------------------------------------------------------
    const resizeCanvas = useCallback(() => {
      const container = boardSurfaceRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      const targetWidth = Math.max(320, Math.floor(rect.width));
      const targetHeight = Math.max(240, Math.floor(rect.height));

      if (canvas.width !== targetWidth * dpr || canvas.height !== targetHeight * dpr) {
        canvas.width = targetWidth * dpr;
        canvas.height = targetHeight * dpr;
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${targetHeight}px`;

        redrawCanvas();
      }
    }, [elements, backgroundMode, activePage]);

    useEffect(() => {
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      return () => window.removeEventListener("resize", resizeCanvas);
    }, [resizeCanvas]);

    // Draw background surface
    const drawBackground = useCallback(
      (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const mode = activePage?.backgroundMode || backgroundMode;

        if (mode === "whiteboard") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        } else if (mode === "grid") {
          ctx.fillStyle = "#0b1536"; // Deep Navy
          ctx.fillRect(0, 0, width, height);
          ctx.strokeStyle = "rgba(19, 86, 232, 0.22)"; // Electric Blue grid lines
          ctx.lineWidth = 1;
          const gridSize = 32;
          ctx.beginPath();
          for (let x = 0; x <= width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }
          for (let y = 0; y <= height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.stroke();
        } else if (mode === "lines") {
          ctx.fillStyle = "#080e22";
          ctx.fillRect(0, 0, width, height);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
          ctx.lineWidth = 1.2;
          const lineGap = 40;
          ctx.beginPath();
          for (let y = 60; y <= height; y += lineGap) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
          ctx.stroke();
        } else {
          // Default Blackboard (BrainLab Deep Slate Navy)
          ctx.fillStyle = "#070d1e";
          ctx.fillRect(0, 0, width, height);
        }

        // Draw slide background image if present
        if (activePage?.backgroundImage) {
          const bgUrl = activePage.backgroundImage;
          const cachedImg = imageCacheRef.current[bgUrl];
          if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            ctx.drawImage(cachedImg, 0, 0, width, height);
          } else if (!cachedImg) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = bgUrl;
            img.onload = () => {
              imageCacheRef.current[bgUrl] = img;
              redrawCanvas();
            };
          }
        }
      },
      [activePage, backgroundMode]
    );

    // Draw element
    const drawElement = useCallback((ctx: CanvasRenderingContext2D, el: WhiteboardElement) => {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (el.type === "highlighter") {
        ctx.globalAlpha = 0.38;
        ctx.lineWidth = el.width * 2.8;
      }

      if ((el.type === "pen" || el.type === "highlighter") && el.points && el.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === "line" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
        ctx.beginPath();
        ctx.moveTo(el.startX, el.startY);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();
      } else if (el.type === "arrow" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
        ctx.beginPath();
        ctx.moveTo(el.startX, el.startY);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();

        const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
        const headLength = Math.max(12, el.width * 3.5);
        ctx.beginPath();
        ctx.moveTo(el.endX, el.endY);
        ctx.lineTo(el.endX - headLength * Math.cos(angle - Math.PI / 6), el.endY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(el.endX - headLength * Math.cos(angle + Math.PI / 6), el.endY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (el.type === "rect" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
        const x = Math.min(el.startX, el.endX);
        const y = Math.min(el.startY, el.endY);
        const w = Math.abs(el.endX - el.startX);
        const h = Math.abs(el.endY - el.startY);
        ctx.strokeRect(x, y, w, h);
      } else if (el.type === "circle" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
        const radiusX = Math.abs(el.endX - el.startX) / 2;
        const radiusY = Math.abs(el.endY - el.startY) / 2;
        const centerX = Math.min(el.startX, el.endX) + radiusX;
        const centerY = Math.min(el.startY, el.endY) + radiusY;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.type === "text" && el.startX !== undefined && el.startY !== undefined && el.text) {
        ctx.font = `600 ${el.fontSize || 22}px Inter, sans-serif`;
        ctx.fillText(el.text, el.startX, el.startY);
      }

      ctx.restore();
    }, []);

    // Full Canvas Redraw Function (Includes vector strokes + ✍️ Laser Trail + Watermark)
    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const logicalWidth = canvas.width / dpr;
      const logicalHeight = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Draw Background
      drawBackground(ctx, logicalWidth, logicalHeight);

      // 2. Apply Zoom
      ctx.save();
      ctx.scale(zoom, zoom);

      // 3. Draw Persistent Elements
      const currentElements = elementsRef.current || [];
      for (const el of currentElements) {
        drawElement(ctx, el);
      }

      // 4. DRAW ✍️ LASER TRAIL & POINTER (Rendered onto canvas so video recorder captures it!)
      const now = Date.now();
      const trail = laserTrailRef.current;
      if (trail.length > 1) {
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (let i = 1; i < trail.length; i++) {
          const p1 = trail[i - 1];
          const p2 = trail[i];
          const age = now - p2.timestamp;
          if (age > 1100) continue;

          const alpha = Math.max(0, 1 - age / 1100);
          ctx.strokeStyle = p2.color || "#ff5238";
          ctx.globalAlpha = alpha * 0.85;
          ctx.lineWidth = Math.max(3, 10 * alpha);
          ctx.shadowColor = p2.color || "#ff5238";
          ctx.shadowBlur = 12 * alpha;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 5. Draw ✍️ Cursor Representation at laser tip
      if (currentLaserPoint) {
        ctx.save();
        const pt = currentLaserPoint;
        ctx.shadowColor = pt.color || "#ff5238";
        ctx.shadowBlur = 15;

        // Glowing circle at tip
        ctx.fillStyle = pt.color || "#ff5238";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // ✍️ Pointer Icon
        ctx.font = "26px sans-serif";
        ctx.fillText("✍️", pt.x - 4, pt.y - 8);
        ctx.restore();
      }

      ctx.restore(); // Undo zoom scale

      // 6. Watermark (BrainLab Academy)
      if (showWatermark) {
        ctx.save();
        ctx.font = "bold 13px Inter, sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.textAlign = "right";
        ctx.fillText("BRAINLAB ACADEMY", logicalWidth - 20, logicalHeight - 16);
        ctx.restore();
      }

      ctx.restore(); // Undo DPR scale
    }, [drawBackground, drawElement, zoom, showWatermark, currentLaserPoint]);

    useEffect(() => {
      redrawCanvas();
    }, [elements, backgroundMode, redrawCanvas, activePage]);

    // ------------------------------------------------------------------------
    // POINTER DRAWING HANDLERS (Mouse, Touch, Stylus)
    // ------------------------------------------------------------------------
    const isDrawingRef = useRef(false);
    const activeElementRef = useRef<WhiteboardElement | null>(null);

    const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      return { x, y };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (readOnly || !canDraw) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = getCanvasCoordinates(e);

      if (tool === "laser") {
        addLaserPoint(x, y, color || "#ff5238");
        return;
      }

      if (tool === "text") {
        setPendingTextPos({ x, y });
        setTextPromptOpen(true);
        return;
      }

      isDrawingRef.current = true;
      const newElId = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (tool === "pen" || tool === "highlighter") {
        activeElementRef.current = {
          id: newElId,
          type: tool,
          color,
          width: strokeWidth,
          points: [{ x, y }],
        };
      } else if (tool === "line" || tool === "arrow" || tool === "rect" || tool === "circle") {
        activeElementRef.current = {
          id: newElId,
          type: tool,
          color,
          width: strokeWidth,
          startX: x,
          startY: y,
          endX: x,
          endY: y,
        };
      } else if (tool === "eraser") {
        // Erase elements within radius
        eraseElementsAt(x, y, 20);
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoordinates(e);

      if (tool === "laser") {
        if (e.buttons > 0 || e.pointerType === "touch" || e.pointerType === "pen") {
          addLaserPoint(x, y, color || "#ff5238");
        } else {
          setCurrentLaserPoint({ x, y, color: color || "#ff5238" });
        }
        return;
      }

      if (!isDrawingRef.current || !activeElementRef.current) return;

      const current = activeElementRef.current;
      if (current.type === "pen" || current.type === "highlighter") {
        current.points?.push({ x, y });
        redrawCanvas();
        // Also draw live active element preview
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            ctx.save();
            ctx.scale(dpr * zoom, dpr * zoom);
            drawElement(ctx, current);
            ctx.restore();
          }
        }
      } else if (["line", "arrow", "rect", "circle"].includes(current.type)) {
        current.endX = x;
        current.endY = y;
        redrawCanvas();
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const dpr = Math.max(1, window.devicePixelRatio || 1);
            ctx.save();
            ctx.scale(dpr * zoom, dpr * zoom);
            drawElement(ctx, current);
            ctx.restore();
          }
        }
      } else if (tool === "eraser") {
        eraseElementsAt(x, y, 20);
      }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (tool === "laser") {
        clearLaser();
        return;
      }

      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      if (activeElementRef.current) {
        const finalEl = { ...activeElementRef.current };
        setElements((prev) => [...prev, finalEl]);
        setRedoStack([]);
        activeElementRef.current = null;

        // Broadcast new element to classroom peers
        if (channel) {
          try {
            channel.send({
              type: "broadcast",
              event: "whiteboard_draw",
              payload: { element: finalEl, pageIndex: activePageIndex, senderId: currentUserId },
            });
          } catch {
            // Non-blocking
          }
        }
      }
    };

    const handlePointerLeave = () => {
      if (tool === "laser") {
        clearLaser();
      }
      isDrawingRef.current = false;
      activeElementRef.current = null;
    };

    // Erase strokes intersecting target point
    const eraseElementsAt = (x: number, y: number, radius = 20) => {
      setElements((prev) =>
        prev.filter((el) => {
          if (el.points) {
            return !el.points.some((p) => Math.hypot(p.x - x, p.y - y) <= radius);
          }
          if (el.startX !== undefined && el.startY !== undefined) {
            return Math.hypot(el.startX - x, el.startY - y) > radius;
          }
          return true;
        })
      );
    };

    // History controls
    const handleUndo = () => {
      if (elements.length === 0) return;
      const last = elements[elements.length - 1];
      setRedoStack((prev) => [...prev, last]);
      setElements((prev) => prev.slice(0, -1));
    };

    const handleRedo = () => {
      if (redoStack.length === 0) return;
      const restore = redoStack[redoStack.length - 1];
      setRedoStack((prev) => prev.slice(0, -1));
      setElements((prev) => [...prev, restore]);
    };

    const handleClear = () => {
      if (elements.length === 0) return;
      if (!window.confirm("Clear all drawings and annotations on this page?")) return;
      setElements([]);
      setRedoStack([]);
    };

    // Text Submission
    const handleTextSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!textInput.trim() || !pendingTextPos) {
        setTextPromptOpen(false);
        return;
      }

      const textEl: WhiteboardElement = {
        id: `text-${Date.now()}`,
        type: "text",
        color,
        width: 2,
        startX: pendingTextPos.x,
        startY: pendingTextPos.y,
        text: textInput.trim(),
        fontSize: textFontSize,
      };

      setElements((prev) => [...prev, textEl]);
      setTextInput("");
      setPendingTextPos(null);
      setTextPromptOpen(false);
    };

    // ------------------------------------------------------------------------
    // PAGE MANAGEMENT HANDLERS (Create, Duplicate, Rename, Delete, Reorder)
    // ------------------------------------------------------------------------
    const handleAddPage = (title?: string, background?: string) => {
      const newPage: WhiteboardPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title || `Page ${pages.length + 1}`,
        elements: [],
        aspectRatio: boardAspectRatio,
        backgroundMode: (background as any) || backgroundMode,
      };
      updatePagesAndNotify((prev) => [...prev, newPage], pages.length);
      setRedoStack([]);
    };

    const handleDuplicatePage = () => {
      const source = activePage;
      const duplicated: WhiteboardPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `${source.title} (Copy)`,
        elements: JSON.parse(JSON.stringify(source.elements)),
        aspectRatio: source.aspectRatio,
        backgroundMode: source.backgroundMode,
        backgroundImage: source.backgroundImage,
      };
      updatePagesAndNotify((prev) => {
        const next = [...prev];
        next.splice(activePageIndex + 1, 0, duplicated);
        return next;
      }, activePageIndex + 1);
    };

    const handleDeletePage = () => {
      if (pages.length <= 1) {
        toast.error("Cannot delete the only remaining page.");
        return;
      }
      if (!window.confirm(`Delete "${activePage.title}"? This cannot be undone.`)) return;

      const nextIndex = Math.max(0, activePageIndex - 1);
      updatePagesAndNotify((prev) => prev.filter((_, idx) => idx !== activePageIndex), nextIndex);
    };

    const handleRenamePage = () => {
      const newTitle = window.prompt("Enter new page title:", activePage.title);
      if (!newTitle || !newTitle.trim()) return;
      updatePagesAndNotify((prev) =>
        prev.map((p, idx) => (idx === activePageIndex ? { ...p, title: newTitle.trim() } : p))
      );
    };

    const handleMovePage = (direction: "up" | "down") => {
      const targetIdx = direction === "up" ? activePageIndex - 1 : activePageIndex + 1;
      if (targetIdx < 0 || targetIdx >= pages.length) return;

      updatePagesAndNotify((prev) => {
        const next = [...prev];
        const temp = next[activePageIndex];
        next[activePageIndex] = next[targetIdx];
        next[targetIdx] = temp;
        return next;
      }, targetIdx);
    };

    const handleSetAspectRatio = (ratio: BoardAspectRatio) => {
      updatePagesAndNotify((prev) =>
        prev.map((p, idx) => (idx === activePageIndex ? { ...p, aspectRatio: ratio } : p))
      );
    };

    // ------------------------------------------------------------------------
    // EXPORT & IMPERATIVE HANDLE
    // ------------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      getCanvasDataUrl: () => {
        const canvas = canvasRef.current;
        return canvas ? canvas.toDataURL("image/png") : null;
      },
      getCanvasElement: () => canvasRef.current,
      clear: handleClear,
      undo: handleUndo,
      redo: handleRedo,
      downloadImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `brainlab-whiteboard-${activePage.title.toLowerCase().replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      },
      addPage: handleAddPage,
      duplicateCurrentPage: handleDuplicatePage,
      deleteCurrentPage: handleDeletePage,
      nextPage: () => {
        if (activePageIndex < pages.length - 1) setActivePageIndex(activePageIndex + 1);
      },
      prevPage: () => {
        if (activePageIndex > 0) setActivePageIndex(activePageIndex - 1);
      },
      setActivePage: (idx: number) => {
        if (idx >= 0 && idx < pages.length) setActivePageIndex(idx);
      },
    }));

    // Calculate aspect ratio CSS
    const getAspectRatioClass = () => {
      if (boardAspectRatio === "16 / 9") return "aspect-video max-w-full";
      if (boardAspectRatio === "4 / 3") return "aspect-4/3 max-w-full";
      if (boardAspectRatio === "9 / 16") return "aspect-9/16 max-h-[85vh]";
      return "w-full h-full";
    };

    return (
      <div
        ref={containerRef}
        className={`relative flex flex-col w-full h-full overflow-hidden bg-[#070d1e] text-white select-none ${
          isFullscreen ? "fixed inset-0 z-50 p-2 bg-slate-950" : ""
        }`}
      >
        {/* ================================================================== */}
        {/* TOP TEACHING TOOLBAR (Clean, Non-overlapping, BrainLab Branded) */}
        {/* ================================================================== */}
        <header className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#0B1536]/95 px-3 py-2 backdrop-blur-md shrink-0 shadow-lg transition-colors">
          {/* Group A: Left side navigation & Page indicator */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPagesDrawer(!showPagesDrawer)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-[#1356E8]/20 hover:bg-[#1356E8]/40 px-3 py-1.5 text-xs font-bold text-blue-200 transition active:scale-95 shadow-sm"
              title="Toggle Pages Drawer (Thumbnails, Reorder, Add)"
            >
              <span>📑</span>
              <span className="hidden sm:inline">Pages</span>
              <span className="rounded-full bg-[#1356E8] px-1.5 py-0.2 text-[10px] font-black text-white">
                {activePageIndex + 1}/{pages.length}
              </span>
            </button>

            {/* Quick Prev / Next */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-0.5">
              <button
                type="button"
                disabled={activePageIndex === 0}
                onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 transition"
                title="Previous Page"
              >
                ◀
              </button>
              <button
                type="button"
                disabled={activePageIndex >= pages.length - 1}
                onClick={() => setActivePageIndex((p) => Math.min(pages.length - 1, p + 1))}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 transition"
                title="Next Page"
              >
                ▶
              </button>
            </div>

            <span className="hidden md:inline-block max-w-[140px] truncate text-xs font-semibold text-slate-300">
              {activePage.title}
            </span>
          </div>

          {/* Group B: Drawing Tools Center Strip */}
          <div className="flex flex-wrap items-center gap-1">
            {/* Pen */}
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                tool === "pen"
                  ? "bg-[#1356E8] text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:bg-white/10"
              }`}
              title="Freehand Vector Pen"
            >
              <span>✏️</span>
              <span className="hidden sm:inline">Pen</span>
            </button>

            {/* Highlighter */}
            <button
              type="button"
              onClick={() => setTool("highlighter")}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                tool === "highlighter"
                  ? "bg-amber-400 text-slate-950 font-black shadow-md ring-1 ring-amber-300"
                  : "text-slate-300 hover:bg-white/10"
              }`}
              title="Translucent Highlighter"
            >
              <span>🖍️</span>
              <span className="hidden sm:inline">Marker</span>
            </button>

            {/* MANDATORY LASER POINTER: ✍️ */}
            <button
              type="button"
              onClick={() => setTool("laser")}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                tool === "laser"
                  ? "bg-[#FF5238] text-white shadow-md ring-2 ring-red-400 animate-pulse font-black"
                  : "text-slate-300 hover:bg-white/10"
              }`}
              title="✍️ Laser Pointer (Live glowing pointing without permanent marks)"
            >
              <span>✍️</span>
              <span className="font-extrabold">Laser</span>
            </button>

            {/* Straight Line */}
            <button
              type="button"
              onClick={() => setTool("line")}
              className={`rounded-xl px-2 py-1.5 text-xs font-bold transition ${
                tool === "line" ? "bg-[#1356E8] text-white" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Straight Line"
            >
              <span>📏</span>
            </button>

            {/* Arrow */}
            <button
              type="button"
              onClick={() => setTool("arrow")}
              className={`rounded-xl px-2 py-1.5 text-xs font-bold transition ${
                tool === "arrow" ? "bg-[#1356E8] text-white" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Vector Arrow"
            >
              <span>➡️</span>
            </button>

            {/* Rectangle Box */}
            <button
              type="button"
              onClick={() => setTool("rect")}
              className={`rounded-xl px-2 py-1.5 text-xs font-bold transition ${
                tool === "rect" ? "bg-[#1356E8] text-white" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Formula Box / Rectangle"
            >
              <span>🔲</span>
            </button>

            {/* Circle */}
            <button
              type="button"
              onClick={() => setTool("circle")}
              className={`rounded-xl px-2 py-1.5 text-xs font-bold transition ${
                tool === "circle" ? "bg-[#1356E8] text-white" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Circle / Ellipse"
            >
              <span>⭕</span>
            </button>

            {/* Text & Math Formula */}
            <button
              type="button"
              onClick={() => setTool("text")}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                tool === "text" ? "bg-[#1356E8] text-white" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Insert Text & Formula Annotation"
            >
              <span>🔤</span>
              <span className="hidden md:inline">Text</span>
            </button>

            {/* Eraser */}
            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                tool === "eraser"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-slate-300 hover:bg-white/10"
              }`}
              title="Eraser"
            >
              <span>🧹</span>
              <span className="hidden md:inline">Eraser</span>
            </button>
          </div>

          {/* Group C: Color Palette & Stroke Widths */}
          <div className="flex items-center gap-1.5">
            {/* Color dots */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {PRESET_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-4.5 w-4.5 rounded-full border transition active:scale-125 ${
                    color === c.value ? "scale-125 border-white ring-2 ring-cyan-400" : "border-transparent opacity-80"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={`${c.name} ink`}
                />
              ))}
            </div>

            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={elements.length === 0}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 transition"
                title="Undo (Ctrl+Z)"
              >
                ↩
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={redoStack.length === 0}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 transition"
                title="Redo (Ctrl+Y)"
              >
                ↪
              </button>
            </div>

            {/* Clear Board */}
            <button
              type="button"
              onClick={handleClear}
              disabled={elements.length === 0}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1.5 text-xs font-bold text-rose-300 disabled:opacity-30 transition"
              title="Clear Canvas"
            >
              🗑️
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-1.5 text-xs text-slate-300 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Board"}
            >
              {isFullscreen ? "🗗" : "⛶"}
            </button>
          </div>
        </header>

        {/* ================================================================== */}
        {/* MAIN WORKSPACE: LEFT THUMBNAIL DRAWER + CENTER CANVAS + RIGHT PROPS */}
        {/* ================================================================== */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* 1. LEFT THUMBNAIL DRAWER */}
          {showPagesDrawer && (
            <aside className="z-30 w-64 md:w-72 flex flex-col border-r border-white/10 bg-[#0B1536]/98 p-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-black tracking-wider uppercase text-blue-300">
                  Pages & Slides ({pages.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowPagesDrawer(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Pages List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => setActivePageIndex(idx)}
                    className={`group relative rounded-xl border p-2.5 cursor-pointer transition ${
                      idx === activePageIndex
                        ? "border-[#1356E8] bg-[#1356E8]/20 shadow-md ring-1 ring-blue-400"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-200">
                        {idx + 1}. {p.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {p.elements.length} obj
                      </span>
                    </div>

                    {/* Miniature Aspect Ratio Preview */}
                    <div className="h-16 w-full rounded-lg bg-[#070d1e] border border-white/5 flex items-center justify-center text-[11px] text-slate-500 overflow-hidden">
                      {p.backgroundImage ? (
                        <span className="text-[10px] text-blue-300">🖼️ Slide Asset</span>
                      ) : (
                        <span>{p.backgroundMode || "Blackboard"}</span>
                      )}
                    </div>

                    {/* Quick Page Actions */}
                    {idx === activePageIndex && (
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenamePage();
                          }}
                          className="text-blue-300 hover:underline"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePage();
                          }}
                          className="text-emerald-300 hover:underline"
                        >
                          Duplicate
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage("up");
                            }}
                            className="text-slate-300 hover:text-white disabled:opacity-20"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === pages.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage("down");
                            }}
                            className="text-slate-300 hover:text-white disabled:opacity-20"
                          >
                            ▼
                          </button>
                        </div>
                        {pages.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage();
                            }}
                            className="text-rose-400 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Page Footer Button */}
              <button
                type="button"
                onClick={() => handleAddPage()}
                className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#1356E8] to-blue-600 hover:from-blue-600 hover:to-blue-500 py-2.5 text-xs font-black text-white shadow-lg transition active:scale-95"
              >
                ＋ Add New Page
              </button>
            </aside>
          )}

          {/* 2. CENTER RESPONSIVE TEACHING CANVAS */}
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative">
            <div
              ref={boardSurfaceRef}
              className={`relative shadow-2xl rounded-2xl overflow-hidden border border-white/10 ${getAspectRatioClass()}`}
              style={{
                cursor:
                  tool === "laser"
                    ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><text y=\'24\' font-size=\'24\'>✍️</text></svg>") 4 28, crosshair'
                    : tool === "eraser"
                    ? "crosshair"
                    : tool === "text"
                    ? "text"
                    : "crosshair",
              }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                className="w-full h-full touch-none block"
              />

              {/* Read-Only Badge for Students */}
              {(readOnly || !canDraw) && (
                <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-1.5 rounded-full bg-[#0B1536]/90 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-200 backdrop-blur shadow-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Viewing Tutor's Whiteboard</span>
                </div>
              )}
            </div>

            {/* Bottom floating quick controls */}
            <footer className="mt-2 flex flex-wrap items-center justify-center gap-2 z-10">
              {/* Aspect Ratio Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B1536]/80 px-2 py-1 text-[11px] font-bold backdrop-blur">
                <span className="text-slate-400">Ratio:</span>
                {(["16 / 9", "4 / 3", "9 / 16", "free"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleSetAspectRatio(r)}
                    className={`rounded px-1.5 py-0.5 transition ${
                      boardAspectRatio === r ? "bg-[#1356E8] text-white font-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Background Mode Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B1536]/80 px-2 py-1 text-[11px] font-bold backdrop-blur">
                <span className="text-slate-400">Board:</span>
                {(
                  [
                    { mode: "blackboard", label: "🌑 Dark" },
                    { mode: "whiteboard", label: "⚪ Light" },
                    { mode: "grid", label: "📐 Grid" },
                    { mode: "lines", label: "📝 Lines" },
                  ] as const
                ).map((b) => (
                  <button
                    key={b.mode}
                    type="button"
                    onClick={() => {
                      setBackgroundMode(b.mode);
                      updatePagesAndNotify((prev) =>
                        prev.map((p, idx) => (idx === activePageIndex ? { ...p, backgroundMode: b.mode } : p))
                      );
                    }}
                    className={`rounded px-1.5 py-0.5 transition ${
                      (activePage.backgroundMode || backgroundMode) === b.mode
                        ? "bg-[#1356E8] text-white font-black"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B1536]/80 px-2 py-1 text-[11px] font-bold backdrop-blur">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="px-1 text-slate-300 hover:text-white"
                  title="Zoom Out"
                >
                  －
                </button>
                <span className="text-slate-200 min-w-8 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                  className="px-1 text-slate-300 hover:text-white"
                  title="Zoom In"
                >
                  ＋
                </button>
                {zoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="ml-1 text-[10px] text-blue-300 hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Export Image action */}
              <button
                type="button"
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const link = document.createElement("a");
                  link.download = `brainlab-whiteboard-${activePage.title.toLowerCase().replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.png`;
                  link.href = canvas.toDataURL("image/png");
                  link.click();
                }}
                className="rounded-xl border border-white/10 bg-[#0B1536]/80 hover:bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200 transition"
                title="Download current page as image"
              >
                💾 Export Image
              </button>

              {onShareToChat && (
                <button
                  type="button"
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) onShareToChat(canvas.toDataURL("image/png"));
                  }}
                  className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm transition"
                  title="Share whiteboard snapshot directly into live classroom chat"
                >
                  💬 Share to Chat
                </button>
              )}
            </footer>
          </main>
        </div>

        {/* ================================================================== */}
        {/* TEXT & MATH FORMULA INSERTION MODAL */}
        {/* ================================================================== */}
        {textPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B1536] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>🔤</span>
                  <span>Insert Text &amp; Formula Annotation</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setTextPromptOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type lesson notes, derivation steps, or physics formula..."
                rows={3}
                className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-3 text-sm font-sans text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                autoFocus
              />

              {/* Quick Math Symbols Palette */}
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Quick Math &amp; Science Symbols
                </span>
                <div className="flex flex-wrap gap-1">
                  {MATH_SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setTextInput((prev) => prev + sym)}
                      className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-xs font-bold text-blue-200 transition"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span>Size:</span>
                  <select
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                    className="rounded-lg border border-white/10 bg-[#070d1e] px-2 py-1 text-xs font-bold text-white outline-none"
                  >
                    <option value={16}>Small (16px)</option>
                    <option value={22}>Normal (22px)</option>
                    <option value={28}>Large (28px)</option>
                    <option value={36}>Heading (36px)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTextPromptOpen(false)}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTextSubmit()}
                    className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-4 py-1.5 text-xs font-black text-white shadow-md"
                  >
                    Insert on Board
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SmartWhiteboard.displayName = "SmartWhiteboard";
