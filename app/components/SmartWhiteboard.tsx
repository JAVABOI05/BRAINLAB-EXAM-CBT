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

export interface SmartWhiteboardProps {
  classId: string;
  isHost: boolean;
  canDraw?: boolean;
  channel?: any;
  currentUserName?: string;
  currentUserId?: string;
  onShareToChat?: (dataUrl: string) => void;
  /** Branding is on by default; platform policy can disable it for the whole classroom. */
  showWatermark?: boolean;
  /** Optional persisted page snapshot for pre-class lesson preparation. */
  initialPages?: WhiteboardPage[];
  initialActivePageIndex?: number;
  onPagesChange?: (pages: WhiteboardPage[], activePageIndex: number) => void;
}

export interface SmartWhiteboardHandle {
  getCanvasDataUrl: () => string | null;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  downloadImage: () => void;
}

type BoardAspectRatio = "16 / 9" | "4 / 3" | "9 / 16" | "free";
export type WhiteboardPage = {
  id: string;
  title: string;
  elements: WhiteboardElement[];
  aspectRatio: BoardAspectRatio;
};

const PRESET_COLORS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Coral", value: "#ef4444" },
  { name: "Purple", value: "#a855f7" },
  { name: "White", value: "#ffffff" },
  { name: "Yellow", value: "#facc15" },
  { name: "Dark", value: "#0f172a" },
];

const STROKE_WIDTHS = [
  { label: "Fine", value: 2 },
  { label: "Normal", value: 4 },
  { label: "Thick", value: 8 },
  { label: "Jumbo", value: 16 },
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
    const [pages, setPages] = useState<WhiteboardPage[]>(
      initialPages?.length ? initialPages : [{ id: "page-1", title: "Page 1", elements: [], aspectRatio: "16 / 9" }]
    );
    const [activePageIndex, setActivePageIndex] = useState(initialActivePageIndex);
    const [pagesHydrated, setPagesHydrated] = useState(false);
    const activePage = pages[activePageIndex] || pages[0];
    const boardAspectRatio = activePage?.aspectRatio || "16 / 9";
    const setBoardAspectRatio = useCallback((ratio: BoardAspectRatio) => {
      setPages((previous) => {
        const nextPages = previous.map((page, index) => index === activePageIndex ? { ...page, aspectRatio: ratio } : page);
        channel?.send({ type: "broadcast", event: "whiteboard_pages_sync", payload: { pages: nextPages, pageIndex: activePageIndex, senderId: currentUserId } });
        return nextPages;
      });
    }, [activePageIndex, channel, currentUserId]);
    const [textFontFamily, setTextFontFamily] = useState<"brainlab" | "chalk" | "mono">("brainlab");

    // Text modal / prompt state
    const [textPromptOpen, setTextPromptOpen] = useState(false);
    const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
    const [textInput, setTextInput] = useState("");
    const [textFontSize, setTextFontSize] = useState<number>(20);

    // Each page owns its own vector elements and aspect ratio. This wrapper
    // preserves the existing drawing handlers while writing edits to the active page.
    const elements = activePage?.elements || [];
    const setElements = useCallback((next: React.SetStateAction<WhiteboardElement[]>) => {
      setPages((previous) => previous.map((page, index) => {
        if (index !== activePageIndex) return page;
        const nextElements = typeof next === "function" ? next(page.elements) : next;
        return { ...page, elements: nextElements };
      }));
    }, [activePageIndex]);
    const [redoStack, setRedoStack] = useState<WhiteboardElement[]>([]);
    const elementsRef = useRef<WhiteboardElement[]>([]);
    const backgroundModeRef = useRef<"blackboard" | "whiteboard" | "grid" | "lines">("blackboard");

    useEffect(() => {
      elementsRef.current = elements;
    }, [elements]);

    // Local-first draft recovery: a temporary network drop must not erase a tutor's
    // prepared pages. Server persistence can sync these snapshots when connectivity returns.
    useEffect(() => {
      if (typeof window === "undefined") return;
      const key = `brainlab-whiteboard-pages:${classId}`;
      try {
        const saved = window.localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved) as { pages?: WhiteboardPage[]; activePageIndex?: number };
          if (Array.isArray(parsed.pages) && parsed.pages.length) {
            setPages(parsed.pages.map((page, index) => ({
              id: typeof page.id === "string" ? page.id : `page-${index + 1}`,
              title: typeof page.title === "string" ? page.title : `Page ${index + 1}`,
              elements: Array.isArray(page.elements) ? page.elements : [],
              aspectRatio: ["16 / 9", "4 / 3", "9 / 16", "free"].includes(page.aspectRatio) ? page.aspectRatio : "16 / 9",
            })));
            setActivePageIndex(Math.min(Math.max(0, parsed.activePageIndex || 0), parsed.pages.length - 1));
          }
        }
      } catch {
        toast.warning("A saved local whiteboard draft could not be restored.");
      } finally {
        setPagesHydrated(true);
      }
    }, [classId]);

    useEffect(() => {
      if (initialPages?.length && !pagesHydrated) {
        setPages(initialPages);
        setActivePageIndex(Math.min(Math.max(0, initialActivePageIndex), initialPages.length - 1));
      }
    }, [initialPages, initialActivePageIndex, pagesHydrated]);

    useEffect(() => {
      onPagesChange?.(pages, activePageIndex);
    }, [pages, activePageIndex, onPagesChange]);

    useEffect(() => {
      if (!pagesHydrated || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(`brainlab-whiteboard-pages:${classId}`, JSON.stringify({ pages, activePageIndex }));
      } catch {
        // Quota/privacy errors should not stop the live whiteboard from working.
      }
    }, [classId, pages, activePageIndex, pagesHydrated]);

    useEffect(() => {
      backgroundModeRef.current = backgroundMode;
    }, [backgroundMode]);

    // Drawing state refs
    const isDrawingRef = useRef(false);
    const activeElementRef = useRef<WhiteboardElement | null>(null);
    const laserTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [laserPoint, setLaserPoint] = useState<{ x: number; y: number } | null>(null);

    // Synchronize canvas dimensions & handle high DPI
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
    }, [elements, backgroundMode]);

    // Draw background (blackboard, whiteboard, math grid, ruled lines)
    const renderBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.save();
      if (backgroundMode === "whiteboard") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Subtle border frame
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, width - 2, height - 2);
      } else if (backgroundMode === "grid") {
        ctx.fillStyle = "#090d16";
        ctx.fillRect(0, 0, width, height);

        // Math coordinate grid
        ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
        ctx.lineWidth = 1;
        const step = 30;
        for (let x = 0; x < width; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Center origin axes (faint accent)
        ctx.strokeStyle = "rgba(6, 182, 212, 0.3)";
        ctx.lineWidth = 1.5;
        const midX = Math.floor(width / 2);
        const midY = Math.floor(height / 2);
        ctx.beginPath();
        ctx.moveTo(midX, 0);
        ctx.lineTo(midX, height);
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
      } else if (backgroundMode === "lines") {
        ctx.fillStyle = "#0b0f19";
        ctx.fillRect(0, 0, width, height);

        // Ruled notebook lines
        ctx.strokeStyle = "rgba(59, 130, 246, 0.18)";
        ctx.lineWidth = 1;
        const step = 32;
        for (let y = step; y < height; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else {
        // Classic blackboard / dark chalkboard
        ctx.fillStyle = "#070b14";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    };

    // Render individual element onto the canvas
    const drawElement = (
      ctx: CanvasRenderingContext2D,
      el: WhiteboardElement,
      scaleX: number = 1,
      scaleY: number = 1
    ) => {
      ctx.save();
      ctx.scale(scaleX, scaleY);

      if (el.type === "highlighter") {
        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.width * 2.8;
        ctx.lineCap = "square";
        ctx.lineJoin = "round";
      } else if (el.type === "eraser") {
        // Erase ink without painting a dark stroke. The board's parent uses the
        // selected background colour so erased areas reveal a clean board surface.
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = Math.max(18, el.width * 6);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = el.color;
        ctx.fillStyle = el.color;
        ctx.lineWidth = el.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }

      if ((el.type === "pen" || el.type === "highlighter" || el.type === "eraser") && el.points && el.points.length > 0) {
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
        const dx = el.endX - el.startX;
        const dy = el.endY - el.startY;
        const angle = Math.atan2(dy, dx);
        const headLen = Math.max(12, el.width * 3.5);

        // Shaft
        ctx.beginPath();
        ctx.moveTo(el.startX, el.startY);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(el.endX, el.endY);
        ctx.lineTo(
          el.endX - headLen * Math.cos(angle - Math.PI / 6),
          el.endY - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          el.endX - headLen * Math.cos(angle + Math.PI / 6),
          el.endY - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (el.type === "rect" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
        const x = Math.min(el.startX, el.endX);
        const y = Math.min(el.startY, el.endY);
        const w = Math.abs(el.endX - el.startX);
        const h = Math.abs(el.endY - el.startY);

        ctx.beginPath();
        ctx.strokeRect(x, y, w, h);
      } else if (el.type === "circle" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
        const radiusX = Math.abs(el.endX - el.startX) / 2;
        const radiusY = Math.abs(el.endY - el.startY) / 2;
        const centerX = Math.min(el.startX, el.endX) + radiusX;
        const centerY = Math.min(el.startY, el.endY) + radiusY;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.type === "text" && el.startX !== undefined && el.startY !== undefined && el.text) {
        const fontFamily = el.fontFamily || '"Trebuchet MS", "Avenir Next", sans-serif';
        ctx.font = `bold ${el.fontSize || 20}px ${fontFamily}`;
        ctx.fillStyle = el.color;
        ctx.fillText(el.text, el.startX, el.startY);
      }

      ctx.restore();
    };

    // Full canvas redraw
    const redrawCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render crisp background scaled to DPR
      renderBackground(ctx, canvas.width, canvas.height);

      // Draw all elements in vector history
      for (const el of elements) {
        drawElement(ctx, el, dpr, dpr);
      }

      // Draw active in-progress shape or stroke
      if (activeElementRef.current) {
        drawElement(ctx, activeElementRef.current, dpr, dpr);
      }
    }, [elements, backgroundMode]);

    useEffect(() => {
      redrawCanvas();
    }, [redrawCanvas]);

    // Handle ResizeObserver
    useEffect(() => {
      const container = boardSurfaceRef.current;
      if (!container) return;

      const ro = new ResizeObserver(() => {
        resizeCanvas();
      });
      ro.observe(container);
      resizeCanvas();

      return () => ro.disconnect();
    }, [resizeCanvas]);

    // Realtime channel event listeners
    useEffect(() => {
      if (!channel) return;

      const handleRemotePagesSync = ({ payload }: { payload: any }) => {
        if (payload?.senderId !== currentUserId && Array.isArray(payload?.pages) && payload.pages.length) {
          setPages(payload.pages);
          setActivePageIndex(Math.min(Math.max(0, Number(payload.pageIndex) || 0), payload.pages.length - 1));
          setRedoStack([]);
        }
      };

      const handleRemotePageChange = ({ payload }: { payload: any }) => {
        if (payload?.senderId !== currentUserId && Number.isInteger(payload?.pageIndex) && payload.pageIndex >= 0) {
          if (Array.isArray(payload.pages) && payload.pages.length) setPages(payload.pages);
          setActivePageIndex(Math.min(payload.pageIndex, pages.length - 1));
          setRedoStack([]);
        }
      };

      const handleRemoteAdd = ({ payload }: { payload: any }) => {
        if (payload?.element && payload.senderId !== currentUserId) {
          setElements((prev) => [...prev, payload.element]);
        }
      };

      const handleRemoteClear = ({ payload }: { payload: any }) => {
        if (payload?.senderId !== currentUserId) {
          setElements([]);
          setRedoStack([]);
        }
      };

      const handleRemoteUndo = ({ payload }: { payload: any }) => {
        if (payload?.senderId !== currentUserId) {
          setElements((prev) => prev.slice(0, -1));
        }
      };

      const handleRemoteBackgroundChange = ({ payload }: { payload: any }) => {
        const nextMode = payload?.backgroundMode;
        if (payload?.senderId !== currentUserId && ["blackboard", "whiteboard", "grid", "lines"].includes(nextMode)) {
          setBackgroundMode(nextMode);
          setColor((current) => {
            if (nextMode === "whiteboard" && ["#06b6d4", "#ffffff"].includes(current.toLowerCase())) return "#0f172a";
            if (nextMode !== "whiteboard" && current.toLowerCase() === "#0f172a") return "#f8fafc";
            return current;
          });
        }
      };

      const handleRemoteLaser = ({ payload }: { payload: any }) => {
        if (payload?.senderId !== currentUserId) {
          if (!payload?.point) {
            setLaserPoint(null);
            if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
            return;
          }
          setLaserPoint(payload.point);
          if (laserTimeoutRef.current) clearTimeout(laserTimeoutRef.current);
          laserTimeoutRef.current = setTimeout(() => {
            setLaserPoint(null);
          }, 1200);
        }
      };

      const handleSyncRequest = () => {
        if (isHost) {
          channel.send({
            type: "broadcast",
            event: "whiteboard_sync_response",
            payload: { elements: elementsRef.current, backgroundMode: backgroundModeRef.current, pages, pageIndex: activePageIndex },
          });
        }
      };

      const handleSyncResponse = ({ payload }: { payload: any }) => {
        if (Array.isArray(payload?.pages) && payload.pages.length) {
          setPages(payload.pages);
          setActivePageIndex(Math.min(Math.max(0, Number(payload.pageIndex) || 0), payload.pages.length - 1));
        } else if (payload?.elements && Array.isArray(payload.elements)) {
          setElements(payload.elements);
        }
        if (payload.backgroundMode) setBackgroundMode(payload.backgroundMode);
      };

      channel.on("broadcast", { event: "whiteboard_pages_sync" }, handleRemotePagesSync);
      channel.on("broadcast", { event: "whiteboard_page_change" }, handleRemotePageChange);
      channel.on("broadcast", { event: "whiteboard_element_add" }, handleRemoteAdd);
      channel.on("broadcast", { event: "whiteboard_clear" }, handleRemoteClear);
      channel.on("broadcast", { event: "whiteboard_undo" }, handleRemoteUndo);
      channel.on("broadcast", { event: "whiteboard_laser" }, handleRemoteLaser);
      channel.on("broadcast", { event: "whiteboard_background_change" }, handleRemoteBackgroundChange);
      channel.on("broadcast", { event: "whiteboard_sync_request" }, handleSyncRequest);
      channel.on("broadcast", { event: "whiteboard_sync_response" }, handleSyncResponse);

      // On join, request current whiteboard snapshot if learner
      if (!isHost) {
        channel.send({
          type: "broadcast",
          event: "whiteboard_sync_request",
          payload: { requesterId: currentUserId },
        });
      }

      return () => {
        channel.off?.("broadcast", { event: "whiteboard_pages_sync" }, handleRemotePagesSync);
        channel.off?.("broadcast", { event: "whiteboard_page_change" }, handleRemotePageChange);
        channel.off?.("broadcast", { event: "whiteboard_element_add" }, handleRemoteAdd);
        channel.off?.("broadcast", { event: "whiteboard_clear" }, handleRemoteClear);
        channel.off?.("broadcast", { event: "whiteboard_undo" }, handleRemoteUndo);
        channel.off?.("broadcast", { event: "whiteboard_laser" }, handleRemoteLaser);
        channel.off?.("broadcast", { event: "whiteboard_background_change" }, handleRemoteBackgroundChange);
        channel.off?.("broadcast", { event: "whiteboard_sync_request" }, handleSyncRequest);
        channel.off?.("broadcast", { event: "whiteboard_sync_response" }, handleSyncResponse);
      };
    }, [channel, currentUserId, isHost, pages, activePageIndex, setElements]);

    // Coordinate conversion (CSS pixels relative to canvas)
    const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      return { x, y };
    };

    // Pointer Down (Mouse / Touch / Stylus)
    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canDraw) {
        toast.info("The host has set the whiteboard to view-only mode for students.");
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = getPointerCoords(e);

      if (tool === "laser") {
        setLaserPoint({ x, y });
        channel?.send({
          type: "broadcast",
          event: "whiteboard_laser",
          payload: { point: { x, y }, senderId: currentUserId },
        });
        return;
      }

      if (tool === "text") {
        setPendingTextPos({ x, y });
        setTextInput("");
        setTextPromptOpen(true);
        return;
      }

      isDrawingRef.current = true;

      const newElement: WhiteboardElement = {
        id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: tool,
        color: tool === "eraser" ? "#000000" : color,
        width: strokeWidth,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        points: [{ x, y }],
      };

      activeElementRef.current = newElement;
      redrawCanvas();
    };

    // Pointer Move
    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getPointerCoords(e);

      if (tool === "laser" && (e.buttons > 0 || e.pointerType === "touch")) {
        setLaserPoint({ x, y });
        channel?.send({
          type: "broadcast",
          event: "whiteboard_laser",
          payload: { point: { x, y }, senderId: currentUserId },
        });
        return;
      }

      if (!isDrawingRef.current || !activeElementRef.current) return;

      const active = activeElementRef.current;

      if (active.type === "pen" || active.type === "highlighter" || active.type === "eraser") {
        active.points = active.points || [];
        active.points.push({ x, y });
      } else {
        // Shapes: line, arrow, rect, circle
        active.endX = x;
        active.endY = y;
      }

      redrawCanvas();
    };

    // Pointer Up
    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (tool === "laser") {
        setLaserPoint(null);
        channel?.send({
          type: "broadcast",
          event: "whiteboard_laser",
          payload: { point: null, senderId: currentUserId },
        });
        return;
      }

      if (!isDrawingRef.current || !activeElementRef.current) {
        isDrawingRef.current = false;
        return;
      }

      const completed = activeElementRef.current;
      isDrawingRef.current = false;
      activeElementRef.current = null;

      // Filter out accidental single-pixel clicks for shapes
      if (
        (completed.type === "line" || completed.type === "arrow" || completed.type === "rect" || completed.type === "circle") &&
        completed.startX === completed.endX &&
        completed.startY === completed.endY
      ) {
        redrawCanvas();
        return;
      }

      setElements((prev) => [...prev, completed]);
      setRedoStack([]); // Clear redo stack on new action
      redrawCanvas();

      // Broadcast new element to classroom peers
      channel?.send({
        type: "broadcast",
        event: "whiteboard_element_add",
        payload: { element: completed, senderId: currentUserId },
      });
    };

    const handlePointerLeave = () => {
      if (tool === "laser") {
        setLaserPoint(null);
        channel?.send({
          type: "broadcast",
          event: "whiteboard_laser",
          payload: { point: null, senderId: currentUserId },
        });
      }
    };

    // Insert Text Annotation
    const handleApplyText = () => {
      if (!pendingTextPos || !textInput.trim()) {
        setTextPromptOpen(false);
        setPendingTextPos(null);
        return;
      }

      const textElement: WhiteboardElement = {
        id: `el_text_${Date.now()}`,
        type: "text",
        color,
        width: 1,
        startX: pendingTextPos.x,
        startY: pendingTextPos.y,
        text: textInput.trim(),
        fontSize: textFontSize,
        fontFamily: textFontFamily === "chalk" ? '"Comic Sans MS", "Chalkboard SE", cursive' : textFontFamily === "mono" ? '"SFMono-Regular", Consolas, monospace' : '"Trebuchet MS", "Avenir Next", sans-serif',
      };

      setElements((prev) => [...prev, textElement]);
      setRedoStack([]);
      setTextPromptOpen(false);
      setPendingTextPos(null);
      setTextInput("");

      channel?.send({
        type: "broadcast",
        event: "whiteboard_element_add",
        payload: { element: textElement, senderId: currentUserId },
      });
    };

    // Undo
    const handleUndo = () => {
      if (elements.length === 0) return;
      const last = elements[elements.length - 1];
      setElements((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, last]);

      channel?.send({
        type: "broadcast",
        event: "whiteboard_undo",
        payload: { senderId: currentUserId },
      });
    };

    // Redo
    const handleRedo = () => {
      if (redoStack.length === 0) return;
      const restored = redoStack[redoStack.length - 1];
      setRedoStack((prev) => prev.slice(0, -1));
      setElements((prev) => [...prev, restored]);

      channel?.send({
        type: "broadcast",
        event: "whiteboard_element_add",
        payload: { element: restored, senderId: currentUserId },
      });
    };

    // Clear Canvas
    const handleClear = () => {
      if (elements.length === 0) return;
      if (window.confirm("Clear all notes and drawings from the whiteboard?")) {
        setElements([]);
        setRedoStack([]);
        channel?.send({
          type: "broadcast",
          event: "whiteboard_clear",
          payload: { senderId: currentUserId },
        });
        toast.info("Whiteboard cleared.");
      }
    };

    // Download High-Res PNG
    const handleDownload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `brainlab-whiteboard-${classId}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Whiteboard lecture notes saved to your device!");
    };

    // Share Snapshot to Classroom Chat
    const handleShareToChat = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      if (onShareToChat) {
        onShareToChat(dataUrl);
        toast.success("Whiteboard diagram posted to class chat!");
      }
    };

    // Imperative Handle
    useImperativeHandle(ref, () => ({
      getCanvasDataUrl: () => {
        const canvas = canvasRef.current;
        return canvas ? canvas.toDataURL("image/png") : null;
      },
      clear: handleClear,
      undo: handleUndo,
      redo: handleRedo,
      downloadImage: handleDownload,
    }));

    return (
      <div
        ref={containerRef}
        className={`w-full h-full flex flex-col relative select-none overflow-hidden ${
          isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-2 sm:p-4" : ""
        }`}
      >
        {/* TOP SMART WHITEBOARD TOOLBAR */}
        <div className="z-20 flex items-center justify-between gap-1.5 border-b border-slate-800 bg-slate-900/95 px-2.5 sm:px-4 py-2 backdrop-blur overflow-x-auto scrollbar-none shrink-0 shadow-md">
          {/* Group 1: Tools */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "pen"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Smooth Pen (Freehand drawing)"
            >
              <span>✏️</span>
              <span className="hidden sm:inline">Pen</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("highlighter")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "highlighter"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Highlighter Marker (Translucent accent)"
            >
              <span>🖍️</span>
              <span className="hidden sm:inline">Marker</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("line")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "line"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Straight Line (Coordinate axes & dividers)"
            >
              <span>📏</span>
              <span className="hidden md:inline">Line</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("arrow")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "arrow"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Directional Vector Arrow (Physics & Math steps)"
            >
              <span>➡️</span>
              <span className="hidden md:inline">Arrow</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("rect")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "rect"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Box / Rectangle (Highlight formulas)"
            >
              <span>🔲</span>
              <span className="hidden md:inline">Box</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("circle")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "circle"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Circle / Ellipse (Venn diagrams & geometry)"
            >
              <span>⭕</span>
              <span className="hidden md:inline">Circle</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("text")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "text"
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Text Annotation (Click canvas to type formulas)"
            >
              <span>🔤</span>
              <span className="hidden sm:inline">Text</span>
            </button>

            <button
              type="button"
              onClick={() => setTool((prev) => (prev === "laser" ? "pen" : "laser"))}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "laser"
                  ? "bg-rose-500 text-white shadow-sm animate-pulse"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Laser Pointer (Live pointing without drawing)"
            >
              <span>🔴</span>
              <span className="hidden lg:inline">Laser</span>
            </button>

            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`rounded-lg p-1.5 text-xs font-bold transition flex items-center gap-1 ${
                tool === "eraser"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Eraser (Erase strokes)"
            >
              <span>🧹</span>
              <span className="hidden sm:inline">Eraser</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700/80 mx-1 shrink-0" />

          {/* Group 2: Color Palette */}
          <div className="flex items-center gap-1 shrink-0">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setColor(c.value);
                  if (tool === "eraser") setTool("pen");
                }}
                className={`h-5 w-5 rounded-full border transition active-press ${
                  color === c.value && tool !== "eraser"
                    ? "scale-125 border-white shadow-md ring-2 ring-cyan-400"
                    : "border-slate-700 opacity-75 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.value }}
                title={`${c.name} ink`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700/80 mx-1 shrink-0" />

          {/* Group 3: Stroke Widths */}
          <div className="flex items-center gap-1 shrink-0">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                type="button"
                onClick={() => setStrokeWidth(sw.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                  strokeWidth === sw.value
                    ? "bg-cyan-500 text-slate-950 font-black shadow-inner"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {sw.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700/80 mx-1 shrink-0" />

          {/* Group 4: Background Style Mode */}
          <div className="flex items-center gap-1 shrink-0">
            <select
              value={backgroundMode}
              disabled={!isHost}
              onChange={(e) => {
                const nextMode = e.target.value as "blackboard" | "whiteboard" | "grid" | "lines";
                setBackgroundMode(nextMode);
                setColor((current) => nextMode === "whiteboard"
                  ? (["#06b6d4", "#ffffff"].includes(current.toLowerCase()) ? "#0f172a" : current)
                  : (current.toLowerCase() === "#0f172a" ? "#f8fafc" : current));
                channel?.send({
                  type: "broadcast",
                  event: "whiteboard_background_change",
                  payload: { backgroundMode: nextMode, senderId: currentUserId },
                });
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200 outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              title={isHost ? "Choose a board style for everyone in the class" : "The tutor controls the board style"}
            >
              <option value="blackboard">🌑 Dark Board</option>
              <option value="whiteboard">⚪ White Dry-Erase</option>
              <option value="grid">📐 Math Grid</option>
              <option value="lines">📝 Ruled Lines</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-700/80 mx-1 shrink-0" />

          {/* Page navigator: every page keeps its own notes and aspect ratio. */}
          <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-[#1356E8]/35 bg-[#0B1536] px-2 py-1.5">
            <span className="hidden text-[10px] font-black uppercase tracking-wider text-blue-200 sm:inline">Pages</span>
            <button
              type="button"
              disabled={activePageIndex === 0}
              onClick={() => {
                const nextIndex = Math.max(0, activePageIndex - 1);
                setActivePageIndex(nextIndex);
                setRedoStack([]);
                channel?.send({ type: "broadcast", event: "whiteboard_page_change", payload: { pageIndex: nextIndex, pages, senderId: currentUserId } });
              }}
              className="rounded-md border border-slate-700 px-2 py-1 text-xs font-bold text-white disabled:opacity-30"
              aria-label="Previous whiteboard page"
            >←</button>
            <select
              value={activePageIndex}
              onChange={(event) => {
                const nextIndex = Number(event.target.value);
                setActivePageIndex(nextIndex);
                setRedoStack([]);
                channel?.send({ type: "broadcast", event: "whiteboard_page_change", payload: { pageIndex: nextIndex, pages, senderId: currentUserId } });
              }}
              className="max-w-[112px] rounded-md bg-slate-900 px-2 py-1 text-xs font-bold text-white outline-none"
              aria-label="Select whiteboard page"
            >
              {pages.map((page, index) => <option key={page.id} value={index}>{page.title || `Page ${index + 1}`}</option>)}
            </select>
            <button
              type="button"
              disabled={!isHost}
              onClick={() => {
                const newPage: WhiteboardPage = { id: `page-${Date.now()}`, title: `Page ${pages.length + 1}`, elements: [], aspectRatio: "16 / 9" };
                const nextPages = [...pages, newPage];
                const nextIndex = nextPages.length - 1;
                setPages(nextPages);
                setActivePageIndex(nextIndex);
                setRedoStack([]);
                channel?.send({ type: "broadcast", event: "whiteboard_pages_sync", payload: { pages: nextPages, pageIndex: nextIndex, senderId: currentUserId } });
              }}
              className="rounded-md bg-blue-600 px-2 py-1 text-xs font-black text-white hover:bg-blue-500 disabled:opacity-40"
              title="Add a new page without clearing existing pages"
            >+ Page</button>
            <button
              type="button"
              disabled={!isHost || pages.length < 2}
              onClick={() => {
                if (!window.confirm("Delete this page and its notes? Other pages will be kept.")) return;
                const nextPages = pages.filter((_, index) => index !== activePageIndex);
                const nextIndex = Math.max(0, Math.min(activePageIndex, nextPages.length - 1));
                setPages(nextPages);
                setActivePageIndex(nextIndex);
                setRedoStack([]);
                channel?.send({ type: "broadcast", event: "whiteboard_pages_sync", payload: { pages: nextPages, pageIndex: nextIndex, senderId: currentUserId } });
              }}
              className="rounded-md border border-rose-500/40 px-2 py-1 text-xs font-bold text-rose-200 disabled:opacity-30"
              title="Delete current page"
            >Delete</button>
          </div>

          {/* Group 5: History, Clear, Export, Fullscreen */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleUndo}
              disabled={elements.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
              title="Undo (Ctrl+Z)"
            >
              ↩️
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition"
              title="Redo (Ctrl+Y)"
            >
              ↪️
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700 transition"
              title="Clear Whiteboard"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-bold text-cyan-300 hover:bg-slate-700 transition flex items-center gap-1"
              title="Download PNG notes"
            >
              <span>💾</span>
              <span className="hidden sm:inline">Save</span>
            </button>
            {onShareToChat && (
              <button
                type="button"
                onClick={handleShareToChat}
                className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-2.5 py-1 text-xs font-black text-white hover:opacity-95 shadow flex items-center gap-1 active-press"
                title="Post snapshot to class chat"
              >
                <span>📸</span>
                <span className="hidden sm:inline">To Chat</span>
              </button>
            )}
            <label className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-200" title="Teaching typography">
              <span className="hidden lg:inline">Type</span>
              <select value={textFontFamily} onChange={(event) => setTextFontFamily(event.target.value as typeof textFontFamily)} className="max-w-[82px] bg-transparent text-[11px] font-bold text-white outline-none" aria-label="Whiteboard typography">
                <option className="text-slate-900" value="brainlab">BrainLab</option>
                <option className="text-slate-900" value="chalk">Chalk</option>
                <option className="text-slate-900" value="mono">Mono</option>
              </select>
            </label>
            <label className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-200" title="Board aspect ratio">
              <span className="hidden md:inline">Board</span>
              <select
                value={boardAspectRatio}
                onChange={(event) => setBoardAspectRatio(event.target.value as typeof boardAspectRatio)}
                className="max-w-[92px] bg-transparent text-[11px] font-bold text-white outline-none"
                aria-label="Whiteboard aspect ratio"
              >
                <option className="text-slate-900" value="16 / 9">Landscape 16:9</option>
                <option className="text-slate-900" value="4 / 3">Classic 4:3</option>
                <option className="text-slate-900" value="9 / 16">Portrait 9:16</option>
                <option className="text-slate-900" value="free">Flexible</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-xs text-slate-300 hover:bg-slate-700 transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Canvas"}
            >
              {isFullscreen ? "🗗" : "⛶"}
            </button>
          </div>
        </div>

        {/* CANVAS DRAWING SURFACE */}
        <div className={`flex-1 min-h-0 w-full relative overflow-auto ${backgroundMode === "whiteboard" ? "bg-white" : backgroundMode === "lines" ? "bg-[#0b0f19]" : backgroundMode === "grid" ? "bg-[#090d16]" : "bg-[#070b14]"} cursor-crosshair touch-none flex items-center justify-center p-3 sm:p-5`}>
          <div
            ref={boardSurfaceRef}
            className="relative overflow-hidden rounded-xl border-[5px] border-slate-700 shadow-[0_16px_60px_rgba(0,0,0,0.45)] ring-1 ring-slate-500/40"
            style={{
              width: boardAspectRatio === "free" ? "100%" : "auto",
              height: "100%",
              maxWidth: "100%",
              maxHeight: "100%",
              aspectRatio: boardAspectRatio === "free" ? undefined : boardAspectRatio,
              flex: boardAspectRatio === "free" ? 1 : "0 1 auto",
            }}
          >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            className="w-full h-full block touch-none"
            style={{ touchAction: "none" }}
          />
          {showWatermark && (
            <div aria-label="BrainLab Academy watermark" className="pointer-events-none absolute bottom-3 right-3 z-10 opacity-25 mix-blend-screen">
              <img src="/brainlab-logo-light.png" alt="BrainLab Academy" className="h-7 sm:h-9 w-auto object-contain" draggable={false} />
            </div>
          )}

          {/* Laser Pointer Highlight (Turns off immediately on pointer release) */}
          {laserPoint && (
            <div
              className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 border-2 border-white shadow-[0_0_15px_rgba(244,63,94,0.95)] flex items-center justify-center transition-all duration-75"
              style={{ left: laserPoint.x, top: laserPoint.y }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            </div>
          )}

          {/* View-Only Learner Pill */}
          {!canDraw && (
            <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Viewing Instructor's Board</span>
            </div>
          )}

          {/* Fullscreen Close button */}
          {isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-30 rounded-xl bg-slate-900/95 border border-slate-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xl hover:bg-slate-800 flex items-center gap-1"
            >
              <span>✕</span> Exit Fullscreen
            </button>
          )}
          </div>
        </div>

        {/* MODAL: Text Tool Input Prompt */}
        {textPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>🔤</span> Add Whiteboard Text / Formula
                </h4>
                <button
                  type="button"
                  onClick={() => setTextPromptOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Annotation Text
                </label>
                <textarea
                  rows={2}
                  autoFocus
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="E.g., F = ma  or  2x + 5 = 15"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Font Size
                  </label>
                  <select
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none"
                  >
                    <option value={14}>Small (14px)</option>
                    <option value={20}>Medium (20px)</option>
                    <option value={28}>Large (28px)</option>
                    <option value={40}>Title (40px)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setTextPromptOpen(false)}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyText}
                    disabled={!textInput.trim()}
                    className="rounded-xl bg-cyan-400 px-4 py-1.5 text-xs font-black text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
                  >
                    Place Text
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
