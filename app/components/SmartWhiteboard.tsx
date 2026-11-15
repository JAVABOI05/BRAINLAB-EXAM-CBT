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
import {
  BoundingBox,
  TransformHandle,
  getElementBoundingBox,
  getElementsBoundingBox,
  hitTestElement,
  getBoundingBoxHandles,
  hitTestHandle,
  translateElement,
  scaleElement,
  boxesIntersect,
  getVirtualDimensions,
  screenToVirtualPoint,
  VIRTUAL_CANVAS_WIDTH,
  VIRTUAL_CANVAS_HEIGHT,
} from "./classroom/whiteboard/geometry";
import {
  RulerState,
  ProtractorState,
  CartesianPlaneConfig,
  createDefaultRuler,
  createDefaultProtractor,
  createDefaultCartesianPlane,
  clampPointToRulerEdge,
  renderRuler,
  renderProtractor,
  hitTestRuler,
  hitTestProtractor,
  generateCartesianElements,
  eraseElementsAlongPath,
} from "./classroom/whiteboard/educationalTools";
import {
  SCIENCE_DIAGRAM_PRESETS,
  ScienceDiagramPreset,
} from "./classroom/whiteboard/scienceDiagrams";
import {
  STEM_FORMULA_PRESETS,
  MathFormulaPreset,
  renderLatexToHtml,
  renderFormulaElement,
  createFormulaElement,
} from "./classroom/whiteboard/formulaEngine";
import { downloadWhiteboardPdf } from "./classroom/whiteboard/pdfService";
import StemLiveboardPresenter from "./classroom/whiteboard/StemLiveboardPresenter";
import "katex/dist/katex.min.css";

export interface WhiteboardElement {
  id: string;
  type: "pen" | "highlighter" | "line" | "arrow" | "rect" | "circle" | "text" | "eraser" | "image";
  color: string;
  width: number;
  height?: number;
  x?: number;
  y?: number;
  strokeWidth?: number;
  creatorId?: string;
  createdAt?: number;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  locked?: boolean;
  groupId?: string;
  opacity?: number;
  fillColor?: string;
  isFormula?: boolean;
  imageUrl?: string;
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
  toggleRuler: () => void;
  toggleProtractor: () => void;
  insertCartesianPlane: (config?: CartesianPlaneConfig) => void;
  insertDiagramPreset: (preset: ScienceDiagramPreset) => void;
  insertFormula: (latex: string) => void;
  downloadPdf: () => void;
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

function WhiteboardIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  switch (name) {
    case "pages":
    case "document":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case "camera":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "file-text":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "minimize":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7" />
        </svg>
      );
    case "maximize":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V4m0 0h4M3 4l6 6m12-2V4m0 0h-4m4 0l-6 6M3 16v4m0 0h4m-4 0l6-6m12 6v-4m0 4h-4m4 0l-6-6" />
        </svg>
      );
    case "pen":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      );
    case "highlighter":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" />
        </svg>
      );
    case "laser":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
        </svg>
      );
    case "line":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" />
        </svg>
      );
    case "arrow":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      );
    case "rect":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      );
    case "circle":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
    case "text":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M12 6v14m-4 0h8" />
        </svg>
      );
    case "eraser":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case "ruler":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M7 7l2-2m2 6l2-2m2 6l2-2" />
        </svg>
      );
    case "protractor":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16a8 8 0 0116 0H4zM12 16v-4" />
        </svg>
      );
    case "chart":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      );
    case "flask":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 5.5a4 4 0 01-.8 2.2L12 14l-2.2-2.3A4 4 0 019 9.5L8 4z" />
        </svg>
      );
    case "trash":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case "save":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      );
    case "chat":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case "unlock":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      );
    case "link":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case "unlink":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m-2.828 2.828l-3.536 3.536M3 3l18 18" />
        </svg>
      );
    case "chevron-up":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      );
    case "chevrons-up":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
        </svg>
      );
    case "chevrons-down":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
        </svg>
      );
    case "close":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case "image":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "select":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      );
    case "instructor":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      );
    case "math":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      );
    case "physics":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "biology":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="9" cy="9" r="4" />
          <circle cx="15" cy="15" r="4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 11.5l1 1" />
        </svg>
      );
    case "rocket":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m0 0l-2.45-2.45" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

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
      "select" | "pen" | "highlighter" | "line" | "arrow" | "rect" | "circle" | "text" | "eraser" | "laser"
    >("pen");
    const [color, setColor] = useState<string>("#06b6d4");
    const [strokeWidth, setStrokeWidth] = useState<number>(4);
    const [backgroundMode, setBackgroundMode] = useState<"blackboard" | "whiteboard" | "grid" | "lines">("blackboard");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState<number>(1);

    // Object Selection & Transformation State (Stage 2)
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const selectedIdsRef = useRef<string[]>([]);
    useEffect(() => {
      selectedIdsRef.current = selectedIds;
    }, [selectedIds]);

    const [hoveredHandle, setHoveredHandle] = useState<TransformHandle | null>(null);
    const [marqueeBox, setMarqueeBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
    const marqueeBoxRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
    useEffect(() => {
      marqueeBoxRef.current = marqueeBox;
    }, [marqueeBox]);

    // Educational Geometry Tools State (Stage 3: Ruler, Protractor)
    const [ruler, setRuler] = useState<RulerState>(createDefaultRuler);
    const rulerRef = useRef<RulerState>(ruler);
    useEffect(() => {
      rulerRef.current = ruler;
    }, [ruler]);

    const [protractor, setProtractor] = useState<ProtractorState>(createDefaultProtractor);
    const protractorRef = useRef<ProtractorState>(protractor);
    useEffect(() => {
      protractorRef.current = protractor;
    }, [protractor]);

    const dragActionRef = useRef<{
      mode: "move" | "resize" | "rotate" | "marquee" | "ruler" | "protractor";
      handle?: TransformHandle;
      toolPart?: string;
      startX: number;
      startY: number;
      initialElements: WhiteboardElement[];
      origBox?: BoundingBox;
      initialRuler?: RulerState;
      initialProtractor?: ProtractorState;
    } | null>(null);

    // Panels visibility (Responsive)
    const [showPagesDrawer, setShowPagesDrawer] = useState(false);
    const [showToolsDrawer, setShowToolsDrawer] = useState(false);
    const [showPropertiesDrawer, setShowPropertiesDrawer] = useState(false);

    // Stage 4: Science & STEM Diagram / Formula Studio State
    const [showStemModal, setShowStemModal] = useState(false);
    const [stemTab, setStemTab] = useState<"formulas" | "physics" | "chemistry" | "biology" | "simulations">("formulas");
    const [customLatex, setCustomLatex] = useState("x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}");
    const [showStemLivePresenter, setShowStemLivePresenter] = useState(false);
    const [stemPresenterInitialSim, setStemPresenterInitialSim] = useState<"quadratic" | "projectile" | "circuit" | "titration" | "genetics">("quadratic");

    // Authoritative pages collection
    const [pages, setPages] = useState<WhiteboardPage[]>(() => {
      if (initialPages && initialPages.length > 0) return initialPages;
      return [{ id: "page-1", title: "Page 1", elements: [], aspectRatio: "free", backgroundMode: "blackboard" }];
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

    const pagesRef = useRef<WhiteboardPage[]>(pages);
    useEffect(() => {
      pagesRef.current = pages;
    }, [pages]);

    const activePageIndexRef = useRef<number>(activePageIndex);
    useEffect(() => {
      activePageIndexRef.current = activePageIndex;
    }, [activePageIndex]);

    const activePage = pages[activePageIndex] || pages[0] || {
      id: "page-1",
      title: "Page 1",
      elements: [],
      aspectRatio: "free" as BoardAspectRatio,
      backgroundMode: "blackboard" as const,
    };

    const boardAspectRatio = activePage?.aspectRatio || "free";

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

    // Notify parent and broadcast authoritative pages change
    const updatePagesAndNotify = useCallback(
      (updater: (prev: WhiteboardPage[]) => WhiteboardPage[], nextActiveIndex?: number) => {
        setPages((prev) => {
          const next = updater(prev);
          const targetIndex = nextActiveIndex !== undefined ? nextActiveIndex : activePageIndex;
          onPagesChange?.(next, targetIndex);
          if (channel && isHost) {
            try {
              channel.send({
                type: "broadcast",
                event: "whiteboard_pages_sync",
                payload: { pages: next, activePageIndex: targetIndex, senderId: currentUserId },
              });
            } catch {
              // Non-blocking
            }
          }
          return next;
        });
        if (nextActiveIndex !== undefined) {
          setActivePageIndex(nextActiveIndex);
          if (channel && isHost) {
            try {
              channel.send({
                type: "broadcast",
                event: "whiteboard_page_change",
                payload: { activePageIndex: nextActiveIndex, senderId: currentUserId },
              });
            } catch {
              // Non-blocking
            }
          }
        }
      },
      [activePageIndex, onPagesChange, channel, isHost, currentUserId]
    );

    // Synchronized active page switcher
    const switchActivePage = useCallback(
      (nextIndexOrFn: number | ((prev: number) => number)) => {
        setActivePageIndex((prev) => {
          const next = typeof nextIndexOrFn === "function" ? nextIndexOrFn(prev) : nextIndexOrFn;
          const bounded = Math.max(0, Math.min(pages.length - 1, next));
          if (bounded !== prev && channel && isHost) {
            try {
              channel.send({
                type: "broadcast",
                event: "whiteboard_page_change",
                payload: { activePageIndex: bounded, senderId: currentUserId },
              });
            } catch {
              // Non-blocking
            }
          }
          return bounded;
        });
      },
      [pages.length, channel, isHost, currentUserId]
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
    // MANDATORY LASER POINTER WITH ANIMATED FADING GLOWING TRAIL
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
    const drawLastSendRef = useRef<number>(0);

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
      const container = boardSurfaceRef.current;
      let observer: ResizeObserver | null = null;
      if (container && typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => {
          resizeCanvas();
        });
        observer.observe(container);
      }
      window.addEventListener("resize", resizeCanvas);
      return () => {
        if (observer) observer.disconnect();
        window.removeEventListener("resize", resizeCanvas);
      };
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

      if (el.opacity !== undefined) {
        ctx.globalAlpha = el.opacity;
      }

      if (el.rotation) {
        const box = getElementBoundingBox(el);
        ctx.translate(box.centerX, box.centerY);
        ctx.rotate(el.rotation);
        ctx.translate(-box.centerX, -box.centerY);
      }

      if (el.type === "highlighter") {
        ctx.globalAlpha = (el.opacity ?? 1) * 0.38;
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
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = el.color;
        }
        if (el.width > 0) ctx.strokeRect(x, y, w, h);
      } else if (el.type === "circle" && el.startX !== undefined && el.startY !== undefined && el.endX !== undefined && el.endY !== undefined) {
        const radiusX = Math.abs(el.endX - el.startX) / 2;
        const radiusY = Math.abs(el.endY - el.startY) / 2;
        const centerX = Math.min(el.startX, el.endX) + radiusX;
        const centerY = Math.min(el.startY, el.endY) + radiusY;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fill();
          ctx.fillStyle = el.color;
        }
        if (el.width > 0) ctx.stroke();
      } else if (el.type === "text" && el.startX !== undefined && el.startY !== undefined && el.text) {
        if (el.text.includes("\\") || el.fontFamily?.includes("Math") || el.isFormula) {
          renderFormulaElement(ctx, el, () => redrawCanvas());
        } else {
          ctx.font = `600 ${el.fontSize || 22}px ${el.fontFamily || "Inter, sans-serif"}`;
          ctx.fillText(el.text, el.startX, el.startY);
        }
      } else if (el.type === "image" && el.imageUrl && el.startX !== undefined && el.startY !== undefined) {
        let cachedImg = (globalThis as any).__wbImgCache?.get(el.imageUrl);
        if (!cachedImg && typeof window !== "undefined") {
          if (!(globalThis as any).__wbImgCache) (globalThis as any).__wbImgCache = new Map();
          const img = new Image();
          img.src = el.imageUrl;
          img.onload = () => redrawCanvas();
          (globalThis as any).__wbImgCache.set(el.imageUrl, img);
          cachedImg = img;
        }
        if (cachedImg && cachedImg.complete) {
          ctx.drawImage(cachedImg, el.startX, el.startY, el.width || 720, el.height || 380);
        }
      }

      ctx.restore();
    }, []);

    // Full Canvas Redraw Function (Includes vector strokes + Laser Trail + Watermark)
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

      // 3.5. DRAW SELECTION BOUNDING BOX & HANDLES (Stage 2)
      const currentSelectedIds = selectedIdsRef.current || [];
      if (currentSelectedIds.length > 0) {
        const selectedEls = currentElements.filter((el) => currentSelectedIds.includes(el.id));
        const box = getElementsBoundingBox(selectedEls);
        if (box) {
          const isLocked = selectedEls.every((e) => e.locked);
          ctx.save();

          // Selection Box highlight
          ctx.fillStyle = isLocked ? "rgba(245, 158, 11, 0.08)" : "rgba(19, 86, 232, 0.08)";
          ctx.fillRect(box.minX, box.minY, box.width, box.height);

          // Dashed border
          ctx.strokeStyle = isLocked ? "#f59e0b" : "#1356E8";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(box.minX, box.minY, box.width, box.height);
          ctx.setLineDash([]);

          if (!isLocked) {
            // Rotation stem & handle
            const rotY = box.minY - 24;
            ctx.beginPath();
            ctx.strokeStyle = "#1356E8";
            ctx.lineWidth = 1.5;
            ctx.moveTo(box.centerX, box.minY);
            ctx.lineTo(box.centerX, rotY);
            ctx.stroke();

            // Rotation handle circle
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#1356E8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(box.centerX, rotY, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 8 resize handles
            const handles = getBoundingBoxHandles(box).filter((h) => h.type !== "rot");
            for (const h of handles) {
              ctx.fillStyle = "#ffffff";
              ctx.strokeStyle = "#1356E8";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.rect(h.x - 4.5, h.y - 4.5, 9, 9);
              ctx.fill();
              ctx.stroke();
            }
          } else {
            // Lock indicator (Vector lock badge drawn directly on canvas)
            const lx = box.maxX - 14;
            const ly = box.minY - 14;
            ctx.fillStyle = "#f59e0b";
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1.5;
            ctx.fillRect(lx - 4, ly + 2, 8, 7);
            ctx.beginPath();
            ctx.arc(lx, ly + 2, 3, Math.PI, 0);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // Marquee Selection Box
      const curMarquee = marqueeBoxRef.current;
      if (curMarquee) {
        ctx.save();
        const mx = Math.min(curMarquee.startX, curMarquee.currentX);
        const my = Math.min(curMarquee.startY, curMarquee.currentY);
        const mw = Math.abs(curMarquee.currentX - curMarquee.startX);
        const mh = Math.abs(curMarquee.currentY - curMarquee.startY);
        ctx.fillStyle = "rgba(19, 86, 232, 0.12)";
        ctx.fillRect(mx, my, mw, mh);
        ctx.strokeStyle = "#1356E8";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(mx, my, mw, mh);
        ctx.restore();
      }

      // 4. DRAW LASER TRAIL & POINTER (Rendered onto canvas so video recorder captures it!)
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

      // 5. Draw Cursor Representation at laser tip
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

        // Laser Pointer vector reticle & glowing center
        ctx.strokeStyle = pt.color || "#ff5238";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pt.x - 14, pt.y);
        ctx.lineTo(pt.x - 7, pt.y);
        ctx.moveTo(pt.x + 7, pt.y);
        ctx.lineTo(pt.x + 14, pt.y);
        ctx.moveTo(pt.x, pt.y - 14);
        ctx.lineTo(pt.x, pt.y - 7);
        ctx.moveTo(pt.x, pt.y + 7);
        ctx.lineTo(pt.x, pt.y + 14);
        ctx.stroke();
        ctx.restore();
      }

      // 5.5. Educational Geometry Tools: Ruler & Protractor (Stage 3)
      if (rulerRef.current.visible) {
        renderRuler(ctx, rulerRef.current);
      }
      if (protractorRef.current.visible) {
        renderProtractor(ctx, protractorRef.current);
      }

      ctx.restore(); // Undo zoom scale

      // 6. Enterprise Dynamic Forensic Watermark (Stage 8)
      if (showWatermark) {
        ctx.save();
        const isWhiteboard = activePage?.backgroundMode === "whiteboard" || backgroundMode === "whiteboard";
        const forensicText = `BrainLab Academy • ${currentUserName} (${currentUserId}) • ${classId || "Live"}`;

        // Semi-transparent tiled diagonal forensic watermark
        ctx.save();
        ctx.font = "bold 13px Inter, sans-serif";
        ctx.fillStyle = isWhiteboard ? "rgba(15, 23, 42, 0.055)" : "rgba(255, 255, 255, 0.065)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.rotate((-22 * Math.PI) / 180);

        const stepX = 360;
        const stepY = 180;
        for (let wx = -logicalWidth * 0.5; wx < logicalWidth * 1.5; wx += stepX) {
          for (let wy = -logicalHeight * 0.5; wy < logicalHeight * 1.5; wy += stepY) {
            ctx.fillText(forensicText, wx, wy);
          }
        }
        ctx.restore();

        // Corner anchor brand
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.fillStyle = isWhiteboard ? "rgba(15, 23, 42, 0.35)" : "rgba(255, 255, 255, 0.35)";
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

    // Z-Index and Object Manipulation Operations (Stage 2)
    const bringToFront = useCallback(() => {
      if (selectedIds.length === 0) return;
      setElements((prev) => [
        ...prev.filter((e) => !selectedIds.includes(e.id)),
        ...prev.filter((e) => selectedIds.includes(e.id)),
      ]);
      toast.info("Brought selected element(s) to front");
    }, [selectedIds, setElements]);

    const sendToBack = useCallback(() => {
      if (selectedIds.length === 0) return;
      setElements((prev) => [
        ...prev.filter((e) => selectedIds.includes(e.id)),
        ...prev.filter((e) => !selectedIds.includes(e.id)),
      ]);
      toast.info("Sent selected element(s) to back");
    }, [selectedIds, setElements]);

    const bringForward = useCallback(() => {
      if (selectedIds.length === 0) return;
      setElements((prev) => {
        const next = [...prev];
        for (let i = next.length - 2; i >= 0; i--) {
          if (selectedIds.includes(next[i].id) && !selectedIds.includes(next[i + 1].id)) {
            const temp = next[i];
            next[i] = next[i + 1];
            next[i + 1] = temp;
          }
        }
        return next;
      });
    }, [selectedIds, setElements]);

    const sendBackward = useCallback(() => {
      if (selectedIds.length === 0) return;
      setElements((prev) => {
        const next = [...prev];
        for (let i = 1; i < next.length; i++) {
          if (selectedIds.includes(next[i].id) && !selectedIds.includes(next[i - 1].id)) {
            const temp = next[i];
            next[i] = next[i - 1];
            next[i - 1] = temp;
          }
        }
        return next;
      });
    }, [selectedIds, setElements]);

    const duplicateSelected = useCallback(() => {
      if (selectedIds.length === 0) return;
      const current = elementsRef.current;
      const toDuplicate = current.filter((e) => selectedIds.includes(e.id));
      const duplicates = toDuplicate.map((el) => {
        const translated = translateElement(el, 24, 24);
        return {
          ...translated,
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        };
      });
      setElements((prev) => [...prev, ...duplicates]);
      setSelectedIds(duplicates.map((d) => d.id));
      setRedoStack([]);
      toast.success(`Duplicated ${duplicates.length} object${duplicates.length > 1 ? "s" : ""}`);
    }, [selectedIds, setElements]);

    const deleteSelected = useCallback(() => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      setElements((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
      setSelectedIds([]);
      setRedoStack([]);
      toast.info(`Deleted ${count} object${count > 1 ? "s" : ""}`);
    }, [selectedIds, setElements]);

    const toggleLockSelected = useCallback(() => {
      if (selectedIds.length === 0) return;
      const current = elementsRef.current;
      const currentlyAllLocked = current.filter((e) => selectedIds.includes(e.id)).every((e) => e.locked);
      setElements((prev) =>
        prev.map((e) => (selectedIds.includes(e.id) ? { ...e, locked: !currentlyAllLocked } : e))
      );
      toast.info(currentlyAllLocked ? "Unlocked object(s)" : "Locked object(s)");
    }, [selectedIds, setElements]);

    const toggleGroupSelected = useCallback(() => {
      if (selectedIds.length < 2) {
        toast.info("Select 2 or more elements to group them.");
        return;
      }
      const current = elementsRef.current;
      const selected = current.filter((e) => selectedIds.includes(e.id));
      const isAlreadyGrouped = selected.every((e) => e.groupId && e.groupId === selected[0]?.groupId);
      if (isAlreadyGrouped) {
        setElements((prev) =>
          prev.map((e) => (selectedIds.includes(e.id) ? { ...e, groupId: undefined } : e))
        );
        toast.info("Ungrouped elements");
      } else {
        const newGroupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setElements((prev) =>
          prev.map((e) => (selectedIds.includes(e.id) ? { ...e, groupId: newGroupId } : e))
        );
        toast.success("Grouped elements together");
      }
    }, [selectedIds, setElements]);

    const recolorSelected = useCallback(
      (newColor: string) => {
        setColor(newColor);
        if (selectedIds.length > 0) {
          setElements((prev) =>
            prev.map((e) => (selectedIds.includes(e.id) ? { ...e, color: newColor } : e))
          );
        }
      },
      [selectedIds, setElements]
    );

    const restrokeSelected = useCallback(
      (newWidth: number) => {
        setStrokeWidth(newWidth);
        if (selectedIds.length > 0) {
          setElements((prev) =>
            prev.map((e) => (selectedIds.includes(e.id) ? { ...e, width: newWidth } : e))
          );
        }
      },
      [selectedIds, setElements]
    );

    // Keyboard Shortcuts Hook
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
          return;
        }

        if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedIdsRef.current.length > 0) {
            e.preventDefault();
            deleteSelected();
          }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
          if (selectedIdsRef.current.length > 0) {
            e.preventDefault();
            duplicateSelected();
          }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
          e.preventDefault();
          setSelectedIds(elementsRef.current.map((el) => el.id));
        } else if (e.key === "Escape") {
          setSelectedIds([]);
        } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          if (selectedIdsRef.current.length > 0) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 2;
            const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
            const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
            setElements((prev) =>
              prev.map((el) => (selectedIdsRef.current.includes(el.id) ? translateElement(el, dx, dy) : el))
            );
          }
        } else if (e.key === "v" || e.key === "V") {
          setTool("select");
        } else if (e.key === "p" || e.key === "P") {
          setTool("pen");
        } else if (e.key === "m" || e.key === "M") {
          setTool("highlighter");
        } else if (e.key === "l" || e.key === "L") {
          setTool("laser");
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [deleteSelected, duplicateSelected, setElements]);

    // Remote classroom real-time synchronization listeners
    useEffect(() => {
      if (!channel) return;

      const handleRemoteElementsSync = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (payload.pageIndex === activePageIndex && Array.isArray(payload.elements)) {
          setElements(payload.elements);
        }
      };

      const handleRemoteStrokeChunk = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (payload.pageIndex === activePageIndex && payload.element) {
          setElements((prev) => {
            const exists = prev.some((el) => el.id === payload.element.id);
            if (exists) {
              return prev.map((el) => (el.id === payload.element.id ? payload.element : el));
            }
            return [...prev, payload.element];
          });
        }
      };

      const handleRemoteDraw = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (payload.pageIndex === activePageIndex && payload.element) {
          setElements((prev) => {
            const exists = prev.some((el) => el.id === payload.element.id);
            if (exists) {
              return prev.map((el) => (el.id === payload.element.id ? payload.element : el));
            }
            return [...prev, payload.element];
          });
        }
      };

      const handleRemotePageChange = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (
          typeof payload.activePageIndex === "number" &&
          payload.activePageIndex >= 0 &&
          payload.activePageIndex < pages.length
        ) {
          setActivePageIndex(payload.activePageIndex);
        }
      };

      const handleRemoteClear = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (payload.pageIndex === activePageIndex) {
          setElements([]);
          setRedoStack([]);
        }
      };

      const handleRemotePagesSync = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (Array.isArray(payload.pages) && payload.pages.length > 0) {
          setPages(payload.pages);
          if (
            typeof payload.activePageIndex === "number" &&
            payload.activePageIndex >= 0 &&
            payload.activePageIndex < payload.pages.length
          ) {
            setActivePageIndex(payload.activePageIndex);
          }
          onPagesChange?.(payload.pages, payload.activePageIndex ?? activePageIndex);
        }
      };

      const handleRemoteRequestSync = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (isHost && channel) {
          try {
            channel.send({
              type: "broadcast",
              event: "whiteboard_pages_sync",
              payload: {
                pages: pagesRef.current,
                activePageIndex: activePageIndexRef.current,
                senderId: currentUserId,
              },
            });
          } catch {
            // Non-blocking
          }
        }
      };

      const handleRemoteStemPresenterToggle = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        if (typeof payload.open === "boolean") {
          setShowStemLivePresenter(payload.open);
        }
      };

      const handleRemoteStemAutoOpen = ({ payload }: { payload: any }) => {
        if (!payload || payload.senderId === currentUserId) return;
        setShowStemLivePresenter(true);
      };

      channel.on?.("broadcast", { event: "whiteboard_elements_sync" }, handleRemoteElementsSync);
      channel.on?.("broadcast", { event: "whiteboard_stroke_chunk" }, handleRemoteStrokeChunk);
      channel.on?.("broadcast", { event: "whiteboard_draw" }, handleRemoteDraw);
      channel.on?.("broadcast", { event: "whiteboard_page_change" }, handleRemotePageChange);
      channel.on?.("broadcast", { event: "whiteboard_clear" }, handleRemoteClear);
      channel.on?.("broadcast", { event: "whiteboard_pages_sync" }, handleRemotePagesSync);
      channel.on?.("broadcast", { event: "whiteboard_request_sync" }, handleRemoteRequestSync);
      channel.on?.("broadcast", { event: "stem_presenter_toggle" }, handleRemoteStemPresenterToggle);
      channel.on?.("broadcast", { event: "stem_event" }, handleRemoteStemAutoOpen);

      // If learner joins, request full authoritative state hydration from host
      if (!isHost) {
        try {
          channel.send({
            type: "broadcast",
            event: "whiteboard_request_sync",
            payload: { senderId: currentUserId },
          });
        } catch {
          // Non-blocking
        }
      }

      return () => {
        channel.off?.("broadcast", { event: "whiteboard_elements_sync" }, handleRemoteElementsSync);
        channel.off?.("broadcast", { event: "whiteboard_stroke_chunk" }, handleRemoteStrokeChunk);
        channel.off?.("broadcast", { event: "whiteboard_draw" }, handleRemoteDraw);
        channel.off?.("broadcast", { event: "whiteboard_page_change" }, handleRemotePageChange);
        channel.off?.("broadcast", { event: "whiteboard_clear" }, handleRemoteClear);
        channel.off?.("broadcast", { event: "whiteboard_pages_sync" }, handleRemotePagesSync);
        channel.off?.("broadcast", { event: "whiteboard_request_sync" }, handleRemoteRequestSync);
        channel.off?.("broadcast", { event: "stem_presenter_toggle" }, handleRemoteStemPresenterToggle);
        channel.off?.("broadcast", { event: "stem_event" }, handleRemoteStemAutoOpen);
      };
    }, [channel, currentUserId, activePageIndex, pages, isHost, onPagesChange, setElements]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (readOnly || !canDraw) return;

      // Stylus Palm Rejection (Stage 9): Ignore broad contact area accidental palm touches
      if (e.pointerType === "touch") {
        const contactArea = (e.width || 0) * (e.height || 0);
        if (contactArea > 750 || ((e.width || 0) > 28 && (e.height || 0) > 28)) {
          return;
        }
      }

      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = getCanvasCoordinates(e);

      // Stylus Pressure Sensitivity (Stage 9)
      let effectiveStrokeWidth = strokeWidth;
      if (e.pointerType === "pen" && typeof e.pressure === "number" && e.pressure > 0) {
        effectiveStrokeWidth = Math.max(1.5, Math.min(strokeWidth * 2.2, strokeWidth * e.pressure * 1.8));
      }

      if (tool === "laser") {
        addLaserPoint(x, y, color || "#ff5238");
        return;
      }

      if (tool === "text") {
        setPendingTextPos({ x, y });
        setTextPromptOpen(true);
        return;
      }

      // 0. Interactive Educational Geometry Tools Hit-Test (Stage 3)
      if (rulerRef.current.visible) {
        const rulerPart = hitTestRuler(x, y, rulerRef.current, 14 / zoom);
        if (rulerPart) {
          dragActionRef.current = {
            mode: "ruler",
            toolPart: rulerPart,
            startX: x,
            startY: y,
            initialElements: [],
            initialRuler: { ...rulerRef.current },
          };
          return;
        }
      }

      if (protractorRef.current.visible) {
        const protPart = hitTestProtractor(x, y, protractorRef.current, 16 / zoom);
        if (protPart) {
          dragActionRef.current = {
            mode: "protractor",
            toolPart: protPart,
            startX: x,
            startY: y,
            initialElements: [],
            initialProtractor: { ...protractorRef.current },
          };
          return;
        }
      }

      const currentElements = elementsRef.current;
      const currentSelected = currentElements.filter((el) => selectedIdsRef.current.includes(el.id));

      // 1. Check if clicking on an active selection handle (resize or rotate)
      if (currentSelected.length > 0) {
        const box = getElementsBoundingBox(currentSelected);
        if (box) {
          const handles = getBoundingBoxHandles(box);
          const clickedHandle = hitTestHandle(handles, x, y, 10 / zoom);
          if (clickedHandle) {
            const isLocked = currentSelected.every((e) => e.locked);
            if (!isLocked) {
              dragActionRef.current = {
                mode: clickedHandle.type === "rot" ? "rotate" : "resize",
                handle: clickedHandle,
                startX: x,
                startY: y,
                initialElements: currentSelected.map((el) => JSON.parse(JSON.stringify(el))),
                origBox: box,
              };
              return;
            }
          }
        }
      }

      // 2. Hit test existing elements (top-most first)
      const hitEl = [...currentElements].reverse().find((el) => hitTestElement(el, x, y, 10 / zoom));

      if (tool === "select") {
        if (hitEl) {
          const groupEls = hitEl.groupId
            ? currentElements.filter((e) => e.groupId === hitEl.groupId)
            : [hitEl];
          const targetIds = groupEls.map((e) => e.id);

          if (e.shiftKey) {
            setSelectedIds((prev) =>
              prev.some((id) => targetIds.includes(id))
                ? prev.filter((id) => !targetIds.includes(id))
                : [...prev, ...targetIds]
            );
          } else {
            if (!selectedIdsRef.current.includes(hitEl.id)) {
              setSelectedIds(targetIds);
            }
          }

          if (!hitEl.locked) {
            const effectiveSelected = currentElements.filter(
              (e) => selectedIdsRef.current.includes(e.id) || targetIds.includes(e.id)
            );
            dragActionRef.current = {
              mode: "move",
              startX: x,
              startY: y,
              initialElements: effectiveSelected.map((el) => JSON.parse(JSON.stringify(el))),
              origBox: getElementsBoundingBox(effectiveSelected) || undefined,
            };
          }
          return;
        } else {
          // Clicked empty space with Select tool
          if (!e.shiftKey) {
            setSelectedIds([]);
          }
          dragActionRef.current = {
            mode: "marquee",
            startX: x,
            startY: y,
            initialElements: [],
          };
          setMarqueeBox({ startX: x, startY: y, currentX: x, currentY: y });
          return;
        }
      }

      // 3. Eraser tool
      if (tool === "eraser") {
        eraseElementsAt(x, y, 20);
        return;
      }

      // 4. Drawing Tools (pen, highlighter, line, arrow, rect, circle)
      setSelectedIds([]);
      isDrawingRef.current = true;
      const newElId = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      let drawX = x;
      let drawY = y;
      if (rulerRef.current.visible) {
        const snap = clampPointToRulerEdge(x, y, rulerRef.current, 28 / zoom);
        if (snap.clamped) {
          drawX = snap.point.x;
          drawY = snap.point.y;
        }
      }

      if (tool === "pen" || tool === "highlighter") {
        activeElementRef.current = {
          id: newElId,
          type: tool,
          color,
          width: effectiveStrokeWidth,
          points: [{ x: drawX, y: drawY }],
        };
      } else if (tool === "line" || tool === "arrow" || tool === "rect" || tool === "circle") {
        activeElementRef.current = {
          id: newElId,
          type: tool,
          color,
          width: strokeWidth,
          startX: drawX,
          startY: drawY,
          endX: drawX,
          endY: drawY,
        };
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

      // 1. Handle Active Drag Action (Move, Resize, Rotate, Marquee, Ruler, Protractor)
      if (dragActionRef.current) {
        const action = dragActionRef.current;

        if (action.mode === "ruler" && action.initialRuler) {
          const init = action.initialRuler;
          if (action.toolPart === "body") {
            const dx = x - action.startX;
            const dy = y - action.startY;
            setRuler((prev) => ({ ...prev, x: init.x + dx, y: init.y + dy }));
          } else if (action.toolPart === "rotate") {
            const cx = init.x + init.width / 2;
            const cy = init.y + init.height / 2;
            const curAngle = Math.atan2(y - cy, x - cx);
            const newRot = curAngle + Math.PI / 2;
            setRuler((prev) => ({ ...prev, rotation: newRot }));
          } else if (action.toolPart === "resize") {
            const dx = x - action.startX;
            const newW = Math.max(180, init.width + dx);
            setRuler((prev) => ({ ...prev, width: newW }));
          }
          redrawCanvas();
          return;
        }

        if (action.mode === "protractor" && action.initialProtractor) {
          const init = action.initialProtractor;
          if (action.toolPart === "body") {
            const dx = x - action.startX;
            const dy = y - action.startY;
            setProtractor((prev) => ({ ...prev, cx: init.cx + dx, cy: init.cy + dy }));
          } else if (action.toolPart === "rotate") {
            const angle = Math.atan2(y - init.cy, x - init.cx) + Math.PI / 2;
            setProtractor((prev) => ({ ...prev, rotation: angle }));
          } else if (action.toolPart === "needle") {
            const rad = -Math.atan2(y - init.cy, x - init.cx) - init.rotation;
            let normRad = ((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (init.mode === "180" && normRad > Math.PI) {
              normRad = normRad > Math.PI * 1.5 ? 0 : Math.PI;
            }
            setProtractor((prev) => ({ ...prev, measuringAngle: normRad }));
          }
          redrawCanvas();
          return;
        }

        if (action.mode === "move") {
          const dx = x - action.startX;
          const dy = y - action.startY;
          const moved = action.initialElements.map((el) => translateElement(el, dx, dy));
          const movedMap = new Map(moved.map((m) => [m.id, m]));
          setElements((prev) => prev.map((el) => movedMap.get(el.id) || el));
          redrawCanvas();
          return;
        }

        if (action.mode === "resize" && action.origBox && action.handle) {
          const orig = action.origBox;
          let newMinX = orig.minX;
          let newMinY = orig.minY;
          let newMaxX = orig.maxX;
          let newMaxY = orig.maxY;

          switch (action.handle.type) {
            case "nw":
              newMinX = x;
              newMinY = y;
              break;
            case "n":
              newMinY = y;
              break;
            case "ne":
              newMaxX = x;
              newMinY = y;
              break;
            case "e":
              newMaxX = x;
              break;
            case "se":
              newMaxX = x;
              newMaxY = y;
              break;
            case "s":
              newMaxY = y;
              break;
            case "sw":
              newMinX = x;
              newMaxY = y;
              break;
            case "w":
              newMinX = x;
              break;
          }

          if (newMaxX - newMinX < 15) {
            if (action.handle.type.includes("w")) newMinX = newMaxX - 15;
            else newMaxX = newMinX + 15;
          }
          if (newMaxY - newMinY < 15) {
            if (action.handle.type.includes("n")) newMinY = newMaxY - 15;
            else newMaxY = newMinY + 15;
          }

          if (e.shiftKey && orig.width > 0 && orig.height > 0) {
            const aspect = orig.width / orig.height;
            const curW = newMaxX - newMinX;
            const curH = newMaxY - newMinY;
            if (curW / curH > aspect) {
              const adjH = curW / aspect;
              if (action.handle.type.includes("n")) newMinY = newMaxY - adjH;
              else newMaxY = newMinY + adjH;
            } else {
              const adjW = curH * aspect;
              if (action.handle.type.includes("w")) newMinX = newMaxX - adjW;
              else newMaxX = newMinX + adjW;
            }
          }

          const newBox: BoundingBox = {
            minX: newMinX,
            minY: newMinY,
            maxX: newMaxX,
            maxY: newMaxY,
            width: newMaxX - newMinX,
            height: newMaxY - newMinY,
            centerX: (newMinX + newMaxX) / 2,
            centerY: (newMinY + newMaxY) / 2,
          };

          const scaled = action.initialElements.map((el) => scaleElement(el, orig, newBox));
          const scaledMap = new Map(scaled.map((s) => [s.id, s]));
          setElements((prev) => prev.map((el) => scaledMap.get(el.id) || el));
          redrawCanvas();
          return;
        }

        if (action.mode === "rotate" && action.origBox) {
          const cx = action.origBox.centerX;
          const cy = action.origBox.centerY;
          const initAngle = Math.atan2(action.startY - cy, action.startX - cx);
          const currAngle = Math.atan2(y - cy, x - cx);
          let delta = currAngle - initAngle;

          if (e.shiftKey) {
            const step = Math.PI / 12;
            delta = Math.round(delta / step) * step;
          }

          const rotated = action.initialElements.map((el) => ({
            ...el,
            rotation: (el.rotation || 0) + delta,
          }));
          const rotatedMap = new Map(rotated.map((r) => [r.id, r]));
          setElements((prev) => prev.map((el) => rotatedMap.get(el.id) || el));
          redrawCanvas();
          return;
        }

        if (action.mode === "marquee") {
          setMarqueeBox({
            startX: action.startX,
            startY: action.startY,
            currentX: x,
            currentY: y,
          });
          const mBox = {
            minX: Math.min(action.startX, x),
            minY: Math.min(action.startY, y),
            maxX: Math.max(action.startX, x),
            maxY: Math.max(action.startY, y),
          };
          const hits = elementsRef.current
            .filter((el) => boxesIntersect(getElementBoundingBox(el), mBox))
            .map((el) => el.id);
          setSelectedIds(hits);
          redrawCanvas();
          return;
        }
      }

      // 2. Handle Drawing Active Element
      if (isDrawingRef.current && activeElementRef.current) {
        const current = activeElementRef.current;
        let drawX = x;
        let drawY = y;
        if (rulerRef.current.visible) {
          const snap = clampPointToRulerEdge(x, y, rulerRef.current, 28 / zoom);
          if (snap.clamped) {
            drawX = snap.point.x;
            drawY = snap.point.y;
          }
        }

        if (current.type === "pen" || current.type === "highlighter") {
          const qX = Math.round(drawX * 10) / 10;
          const qY = Math.round(drawY * 10) / 10;
          current.points?.push({ x: qX, y: qY });
          // Throttle active stroke sync to peers at 25fps (40ms) for low-bandwidth resilience
          const moveNow = Date.now();
          if (channel && moveNow - drawLastSendRef.current > 40) {
            drawLastSendRef.current = moveNow;
            try {
              channel.send({
                type: "broadcast",
                event: "whiteboard_stroke_chunk",
                payload: {
                  element: { ...current, points: [...(current.points || [])] },
                  pageIndex: activePageIndex,
                  senderId: currentUserId,
                },
              });
            } catch {}
          }
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
        } else if (["line", "arrow", "rect", "circle"].includes(current.type)) {
          current.endX = drawX;
          current.endY = drawY;
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
        }
        return;
      }

      if (tool === "eraser" && e.buttons > 0) {
        eraseElementsAt(x, y, 22);
        return;
      }

      // 3. Hover Feedback for Handles and Objects
      if (selectedIdsRef.current.length > 0) {
        const selectedEls = elementsRef.current.filter((e) => selectedIdsRef.current.includes(e.id));
        const box = getElementsBoundingBox(selectedEls);
        if (box) {
          const handles = getBoundingBoxHandles(box);
          const handle = hitTestHandle(handles, x, y, 10 / zoom);
          setHoveredHandle(handle);
          return;
        }
      }
      setHoveredHandle(null);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (tool === "laser") {
        clearLaser();
        return;
      }

      // Finalize Drag Action
      if (dragActionRef.current) {
        const action = dragActionRef.current;
        dragActionRef.current = null;
        setMarqueeBox(null);

        if (action.mode === "move" || action.mode === "resize" || action.mode === "rotate") {
          setRedoStack([]);
          if (channel) {
            try {
              channel.send({
                type: "broadcast",
                event: "whiteboard_elements_sync",
                payload: { elements: elementsRef.current, pageIndex: activePageIndex, senderId: currentUserId },
              });
            } catch {
              // Non-blocking
            }
          }
        }
        redrawCanvas();
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
      if (dragActionRef.current) {
        dragActionRef.current = null;
        setMarqueeBox(null);
        redrawCanvas();
      }
      isDrawingRef.current = false;
      activeElementRef.current = null;
      setHoveredHandle(null);
    };

    // Erase strokes intersecting target point (Stage 3: Full stroke-crossing vector erasure)
    const eraseElementsAt = (x: number, y: number, radius = 22) => {
      setElements((prev) => {
        const { remaining, erasedCount } = eraseElementsAlongPath(prev, x, y, radius / zoom);
        if (erasedCount > 0) {
          const removed = prev.filter((el) => !remaining.includes(el));
          if (removed.length > 0) {
            setRedoStack((r) => [...r, ...removed]);
          }
        }
        return remaining;
      });
    };

    // Insert Cartesian Graphing Coordinate System (Stage 3)
    const insertCartesianPlane = useCallback((customConfig?: CartesianPlaneConfig) => {
      const config = customConfig || createDefaultCartesianPlane();
      const elementsToAdd = generateCartesianElements(config);
      setElements((prev) => [...prev, ...elementsToAdd]);
      setRedoStack([]);
      toast.success("Inserted Cartesian Coordinate Grid (x, y)");
      redrawCanvas();
    }, [setElements, redrawCanvas]);

    // Insert STEM Science Diagram Preset (Stage 4)
    const insertDiagramPreset = useCallback((preset: ScienceDiagramPreset) => {
      const cx = 960;
      const cy = 540;
      const elementsToAdd = preset.generate(cx, cy, 1);
      setElements((prev) => {
        const next = [...prev, ...elementsToAdd];
        if (channel) {
          try {
            channel.send({
              type: "broadcast",
              event: "whiteboard_elements_sync",
              payload: { elements: next, pageIndex: activePageIndex, senderId: currentUserId },
            });
          } catch {
            // Non-blocking
          }
        }
        return next;
      });
      setRedoStack([]);
      toast.success(`Inserted ${preset.name} onto board!`);
      setShowStemModal(false);
      redrawCanvas();
    }, [setElements, redrawCanvas, channel, activePageIndex, currentUserId]);

    // Insert Mathematical Formula (Stage 4)
    const insertFormula = useCallback((latex: string) => {
      const cx = 800;
      const cy = 500;
      const el = createFormulaElement(latex, cx, cy, color || "#38bdf8", 26);
      setElements((prev) => [...prev, el]);
      setRedoStack([]);
      if (channel) {
        try {
          channel.send({
            type: "broadcast",
            event: "whiteboard_draw",
            payload: { element: el, pageIndex: activePageIndex, senderId: currentUserId },
          });
        } catch {
          // Non-blocking
        }
      }
      toast.success("Inserted mathematical formula onto board!");
      setShowStemModal(false);
      redrawCanvas();
    }, [color, setElements, redrawCanvas, channel, activePageIndex, currentUserId]);

    // Liveboard Mode A: STEM Interactive Presenter Controls (BL-STEM-002)
    const toggleStemLivePresenter = useCallback(
      (open: boolean) => {
        setShowStemLivePresenter(open);
        if (channel && isHost) {
          try {
            channel.send({
              type: "broadcast",
              event: "stem_presenter_toggle",
              payload: { open, senderId: currentUserId },
            });
          } catch {
            // Non-blocking
          }
        }
      },
      [channel, isHost, currentUserId]
    );

    const handleStemSnapshotToBoard = useCallback(
      (svgDataUrl: string) => {
        const cx = 960;
        const cy = 540;
        const w = 640;
        const h = 480;
        const newElement: WhiteboardElement = {
          id: `stem-snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "image",
          startX: cx - w / 2,
          startY: cy - h / 2,
          endX: cx + w / 2,
          endY: cy + h / 2,
          width: w,
          height: h,
          imageUrl: svgDataUrl,
          color: "#ffffff",
        };

        setElements((prev) => {
          const next = [...prev, newElement];
          if (channel) {
            try {
              channel.send({
                type: "broadcast",
                event: "whiteboard_draw",
                payload: { element: newElement, pageIndex: activePageIndex, senderId: currentUserId },
              });
            } catch {
              // Non-blocking
            }
          }
          return next;
        });
        setRedoStack([]);
        toast.success("Stamped STEM Lab snapshot onto board!");
        redrawCanvas();
      },
      [setElements, redrawCanvas, channel, activePageIndex, currentUserId]
    );

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
      if (channel) {
        try {
          channel.send({
            type: "broadcast",
            event: "whiteboard_clear",
            payload: { pageIndex: activePageIndex, senderId: currentUserId },
          });
        } catch {
          // Non-blocking
        }
      }
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

      if (channel) {
        try {
          channel.send({
            type: "broadcast",
            event: "whiteboard_draw",
            payload: { element: textEl, pageIndex: activePageIndex, senderId: currentUserId },
          });
        } catch {
          // Non-blocking
        }
      }
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
    const handleExportImage = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `brainlab-whiteboard-${activePage.title.toLowerCase().replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Whiteboard lecture notes saved to your device!");
    }, [activePage.title]);

    const handleExportPdf = useCallback(async () => {
      toast.info("Generating multi-page PDF lecture notes...");
      const filename = `brainlab-notes-${(activePage.title || "lecture").toLowerCase().replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const ok = await downloadWhiteboardPdf(pages, filename);
      if (ok) {
        toast.success(`Exported ${pages.length} page(s) to ${filename}!`);
      } else {
        toast.error("Failed to generate PDF document.");
      }
    }, [pages, activePage.title]);

    useImperativeHandle(ref, () => ({
      getCanvasDataUrl: () => {
        const canvas = canvasRef.current;
        return canvas ? canvas.toDataURL("image/png") : null;
      },
      getCanvasElement: () => canvasRef.current,
      clear: handleClear,
      undo: handleUndo,
      redo: handleRedo,
      downloadImage: handleExportImage,
      downloadPdf: handleExportPdf,
      addPage: handleAddPage,
      duplicateCurrentPage: handleDuplicatePage,
      deleteCurrentPage: handleDeletePage,
      nextPage: () => {
        if (activePageIndex < pages.length - 1) switchActivePage(activePageIndex + 1);
      },
      prevPage: () => {
        if (activePageIndex > 0) switchActivePage(activePageIndex - 1);
      },
      setActivePage: (idx: number) => {
        if (idx >= 0 && idx < pages.length) switchActivePage(idx);
      },
      toggleRuler: () => {
        setRuler((r) => ({ ...r, visible: !r.visible }));
        redrawCanvas();
      },
      toggleProtractor: () => {
        setProtractor((p) => ({ ...p, visible: !p.visible }));
        redrawCanvas();
      },
      insertCartesianPlane,
      insertDiagramPreset,
      insertFormula,
    }));

    // Calculate aspect ratio CSS
    const getAspectRatioClass = () => {
      if (boardAspectRatio === "16 / 9") return "aspect-video max-w-full max-h-full";
      if (boardAspectRatio === "4 / 3") return "aspect-4/3 max-w-full max-h-full";
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
              <WhiteboardIcon name="pages" className="h-3.5 w-3.5" />
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
                onClick={() => switchActivePage((p) => Math.max(0, p - 1))}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-30 transition"
                title="Previous Page"
              >
                ◀
              </button>
              <button
                type="button"
                disabled={activePageIndex >= pages.length - 1}
                onClick={() => switchActivePage((p) => Math.min(pages.length - 1, p + 1))}
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

          {/* Group B & C: Responsive Toolbar with Role Awareness (Tutor vs Student) */}
          {readOnly || !canDraw ? (
            /* ================================================================== */
            /* STUDENT MODE VIEW: Clean, Uncluttered, Reading & Note-Saving Mode  */
            /* ================================================================== */
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <WhiteboardIcon name="instructor" className="h-3.5 w-3.5 text-blue-300" />
                <span>Viewing Instructor&apos;s Live Whiteboard</span>
              </div>

              {/* Student Action: Save Notes */}
              <button
                type="button"
                onClick={handleExportImage}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-200 transition active:scale-95 shadow-sm"
                title="Download high-resolution snapshot of this lecture page"
              >
                <WhiteboardIcon name="camera" className="h-3.5 w-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Save Page Notes</span>
              </button>

              {/* Student Action: Multi-Page PDF Notes */}
              <button
                type="button"
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/20 hover:bg-sky-500/30 px-3 py-1.5 text-xs font-bold text-sky-200 transition active:scale-95 shadow-sm"
                title="Download all lecture pages as a consolidated PDF document"
              >
                <WhiteboardIcon name="file-text" className="h-3.5 w-3.5 text-sky-300" />
                <span className="hidden sm:inline">Export PDF ({pages.length})</span>
              </button>

              {/* Zoom Controls for Students */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                  className="px-1 text-slate-300 hover:text-white"
                  title="Zoom Out"
                >
                  －
                </button>
                <span className="text-slate-200 min-w-8 text-center text-[11px] font-mono">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                  className="px-1 text-slate-300 hover:text-white"
                  title="Zoom In"
                >
                  ＋
                </button>
              </div>

              {/* Fullscreen for Students */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-1.5 text-xs text-slate-300 transition"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Board"}
              >
                <WhiteboardIcon name={isFullscreen ? "minimize" : "maximize"} className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* ================================================================== */
            /* TUTOR / INSTRUCTOR MODE VIEW: Full Authoritative Teaching Tools     */
            /* ================================================================== */
            <>
              {/* Group B: Drawing Tools Center Strip */}
              <div className="flex flex-wrap items-center gap-1">
                {/* Select & Transform Tool (Stage 2) */}
                <button
                  type="button"
                  onClick={() => setTool("select")}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    tool === "select"
                      ? "bg-[#1356E8] text-white shadow-md ring-1 ring-blue-400 font-black"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                  title="Select, Move, Scale & Rotate Objects (V)"
                >
                  <WhiteboardIcon name="select" className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Select</span>
                </button>

                {/* Pen */}
                <button
                  type="button"
                  onClick={() => setTool("pen")}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    tool === "pen"
                      ? "bg-[#1356E8] text-white shadow-md ring-1 ring-blue-400"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                  title="Freehand Vector Pen (P)"
                >
                  <WhiteboardIcon name="pen" className="h-3.5 w-3.5" />
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
                  <WhiteboardIcon name="highlighter" className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Marker</span>
                </button>

                {/* MANDATORY LASER POINTER */}
                <button
                  type="button"
                  onClick={() => setTool("laser")}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    tool === "laser"
                      ? "bg-[#FF5238] text-white shadow-md ring-2 ring-red-400 animate-pulse font-black"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                  title="Laser Pointer (Live glowing pointing without permanent marks)"
                >
                  <WhiteboardIcon name="laser" className="h-3.5 w-3.5" />
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
                  <WhiteboardIcon name="line" className="h-3.5 w-3.5" />
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
                  <WhiteboardIcon name="arrow" className="h-3.5 w-3.5" />
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
                  <WhiteboardIcon name="rect" className="h-3.5 w-3.5" />
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
                  <WhiteboardIcon name="circle" className="h-3.5 w-3.5" />
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
                  <WhiteboardIcon name="text" className="h-3.5 w-3.5" />
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
                  <WhiteboardIcon name="eraser" className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Eraser</span>
                </button>

                {/* Stage 3: Educational Geometry Suite (Ruler, Protractor, Cartesian Plane) */}
                <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 ml-0.5">
                  {/* Digital Ruler */}
                  <button
                    type="button"
                    onClick={() => {
                      setRuler((r) => ({ ...r, visible: !r.visible }));
                      redrawCanvas();
                    }}
                    className={`rounded-xl px-2 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                      ruler.visible
                        ? "bg-amber-400 text-slate-950 font-black shadow-md ring-1 ring-amber-300"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                    title="Interactive Digital Ruler (Click to snap straight lines along edge)"
                  >
                    <WhiteboardIcon name="ruler" className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Ruler</span>
                  </button>

                  {/* Protractor */}
                  <button
                    type="button"
                    onClick={() => {
                      setProtractor((p) => ({ ...p, visible: !p.visible }));
                      redrawCanvas();
                    }}
                    className={`rounded-xl px-2 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                      protractor.visible
                        ? "bg-sky-400 text-slate-950 font-black shadow-md ring-1 ring-sky-300"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                    title="Interactive Protractor (Angle measurement arm ±0.5° precision)"
                  >
                    <WhiteboardIcon name="protractor" className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Protractor</span>
                  </button>

                  {/* Cartesian Plane Grid Generator */}
                  <button
                    type="button"
                    onClick={() => insertCartesianPlane()}
                    className="rounded-xl px-2 py-1.5 text-xs font-bold transition text-slate-300 hover:bg-white/10 flex items-center gap-1 border border-white/10"
                    title="Insert Cartesian Coordinate Axes (X, Y Grid Vectors)"
                  >
                    <WhiteboardIcon name="chart" className="h-3.5 w-3.5" />
                    <span className="hidden xl:inline">Graph Grid</span>
                  </button>

                  {/* STEM Science & Math Studio (Stage 4) */}
                  <button
                    type="button"
                    onClick={() => setShowStemModal(true)}
                    className="rounded-xl px-2.5 py-1.5 text-xs font-bold transition bg-[#1356E8]/20 hover:bg-[#1356E8]/40 text-blue-200 border border-blue-500/30 flex items-center gap-1 shadow-sm"
                    title="Open STEM Studio (LaTeX Math Formulas, Circuit Components, Chemical Apparatus, Biology Cells)"
                  >
                    <WhiteboardIcon name="flask" className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">STEM Studio</span>
                  </button>
                </div>
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
                  <WhiteboardIcon name="trash" className="h-3.5 w-3.5" />
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-1.5 text-xs text-slate-300 transition"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Board"}
                >
                  <WhiteboardIcon name={isFullscreen ? "minimize" : "maximize"} className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
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
                  <WhiteboardIcon name="close" className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Pages List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => switchActivePage(idx)}
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
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-300">
                          <WhiteboardIcon name="image" className="h-3 w-3" />
                          Slide Asset
                        </span>
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
          <main className="flex-1 w-full h-full flex flex-col items-center justify-center p-0 overflow-hidden relative select-none">
            <div
              ref={boardSurfaceRef}
              className={`relative shadow-2xl overflow-hidden ${
                boardAspectRatio === "free" ? "w-full h-full rounded-none border-0" : "rounded-2xl border border-white/10"
              } ${getAspectRatioClass()}`}
              style={{
                cursor:
                  hoveredHandle
                    ? hoveredHandle.cursor
                    : tool === "select"
                    ? "default"
                    : tool === "laser"
                    ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><circle cx=\'16\' cy=\'16\' r=\'5\' fill=\'%23ef4444\' fill-opacity=\'0.85\'/><circle cx=\'16\' cy=\'16\' r=\'12\' fill=\'none\' stroke=\'%23ef4444\' stroke-width=\'2\'/><line x1=\'16\' y1=\'0\' x2=\'16\' y2=\'8\' stroke=\'%23ef4444\' stroke-width=\'2\'/><line x1=\'16\' y1=\'24\' x2=\'16\' y2=\'32\' stroke=\'%23ef4444\' stroke-width=\'2\'/><line x1=\'0\' y1=\'16\' x2=\'8\' y2=\'16\' stroke=\'%23ef4444\' stroke-width=\'2\'/><line x1=\'24\' y1=\'16\' x2=\'32\' y2=\'16\' stroke=\'%23ef4444\' stroke-width=\'2\'/></svg>") 16 16, crosshair'
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

              {/* Floating Contextual Action Bar for Selected Objects (Stage 2) */}
              {selectedIds.length > 0 && !readOnly && canDraw && (() => {
                const currentElements = elementsRef.current || [];
                const selectedEls = currentElements.filter((e) => selectedIds.includes(e.id));
                const selBox = getElementsBoundingBox(selectedEls);
                if (!selBox) return null;
                const isAllLocked = selectedEls.every((e) => e.locked);
                const hasGroup = selectedEls.some((e) => e.groupId);

                return (
                  <div
                    className="absolute z-30 flex flex-wrap items-center gap-1 rounded-2xl border border-blue-500/30 bg-[#0B1536]/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150"
                    style={{
                      left: `${Math.max(16, Math.min((selBox.centerX * zoom) - 150, (boardSurfaceRef.current?.clientWidth || 600) - 340))}px`,
                      top: `${Math.max(12, (selBox.minY * zoom) - 52)}px`,
                    }}
                  >
                    {/* Badge: Count of selected items */}
                    <span className="rounded-lg bg-[#1356E8]/30 border border-blue-400/30 px-2 py-0.5 text-[10px] font-black text-blue-200">
                      {selectedEls.length} selected
                    </span>

                    <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={deleteSelected}
                      className="rounded-lg p-1.5 text-xs text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition"
                      title="Delete selected (Del / Backspace)"
                    >
                      <WhiteboardIcon name="trash" className="h-3.5 w-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={duplicateSelected}
                      className="rounded-lg p-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition"
                      title="Duplicate selected (Ctrl+D)"
                    >
                      <WhiteboardIcon name="pages" className="h-3.5 w-3.5" />
                    </button>

                    {/* Lock / Unlock */}
                    <button
                      type="button"
                      onClick={toggleLockSelected}
                      className={`rounded-lg p-1.5 text-xs transition ${
                        isAllLocked ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-300 hover:bg-white/10"
                      }`}
                      title={isAllLocked ? "Unlock object(s)" : "Lock object(s)"}
                    >
                      <WhiteboardIcon name={isAllLocked ? "lock" : "unlock"} className="h-3.5 w-3.5" />
                    </button>

                    {/* Group / Ungroup */}
                    {(selectedEls.length >= 2 || hasGroup) && (
                      <button
                        type="button"
                        onClick={toggleGroupSelected}
                        className="rounded-lg p-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition"
                        title={hasGroup ? "Ungroup elements" : "Group elements together"}
                      >
                        <WhiteboardIcon name={hasGroup ? "unlink" : "link"} className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

                    {/* Z-Index Controls */}
                    <button
                      type="button"
                      onClick={bringForward}
                      className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                      title="Bring Forward"
                    >
                      <WhiteboardIcon name="chevron-up" className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={sendBackward}
                      className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                      title="Send Backward"
                    >
                      <WhiteboardIcon name="chevron-down" className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={bringToFront}
                      className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                      title="Bring to Front"
                    >
                      <WhiteboardIcon name="chevrons-up" className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={sendToBack}
                      className="rounded-lg px-1.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                      title="Send to Back"
                    >
                      <WhiteboardIcon name="chevrons-down" className="h-3 w-3" />
                    </button>

                    <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

                    {/* Quick Recoloring Dots */}
                    <div className="flex items-center gap-1 pl-0.5">
                      {PRESET_COLORS.slice(0, 5).map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => recolorSelected(c.value)}
                          className="h-3.5 w-3.5 rounded-full border border-white/20 hover:scale-125 transition"
                          style={{ backgroundColor: c.value }}
                          title={`Recolor to ${c.name}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Read-Only Badge for Students */}
              {(readOnly || !canDraw) && (
                <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-1.5 rounded-full bg-[#0B1536]/90 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-200 backdrop-blur shadow-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Viewing Tutor's Whiteboard</span>
                </div>
              )}

              {/* STEM Studio Interactive Presenter Overlay (Mode A Synchronized) */}
              {showStemLivePresenter && (
                <div className="absolute inset-0 z-40 bg-[#070d1e]/95 backdrop-blur-md p-2 sm:p-4 flex flex-col animate-in fade-in duration-200">
                  <StemLiveboardPresenter
                    channel={channel}
                    currentUserId={currentUserId}
                    isHost={isHost}
                    theme="dark"
                    initialSim={stemPresenterInitialSim}
                    onClose={() => toggleStemLivePresenter(false)}
                    onSnapshotToBoard={handleStemSnapshotToBoard}
                  />
                </div>
              )}
            </div>

            {/* Floating Quick Controls (Tutor Only: Ratio, Board Surface, Zoom, Export) */}
            {!readOnly && canDraw && (
              <footer className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 z-20 shadow-2xl">
                {/* Aspect Ratio Selector */}
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B1536]/90 px-2 py-1 text-[11px] font-bold backdrop-blur shadow-lg">
                  <span className="text-slate-400">Ratio:</span>
                  {(["free", "16 / 9", "4 / 3", "9 / 16"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSetAspectRatio(r)}
                      className={`rounded px-1.5 py-0.5 transition ${
                        boardAspectRatio === r ? "bg-[#1356E8] text-white font-black" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {r === "free" ? "Full" : r}
                    </button>
                  ))}
                </div>

                {/* Background Mode Selector */}
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B1536]/90 px-2 py-1 text-[11px] font-bold backdrop-blur shadow-lg">
                  <span className="text-slate-400">Board:</span>
                  {(
                    [
                      { mode: "blackboard", label: "Dark" },
                      { mode: "whiteboard", label: "Light" },
                      { mode: "grid", label: "Grid" },
                      { mode: "lines", label: "Lines" },
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
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0B1536]/90 px-2 py-1 text-[11px] font-bold backdrop-blur shadow-lg">
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
                  className="rounded-xl border border-white/10 bg-[#0B1536]/90 hover:bg-[#1356E8] px-2.5 py-1 text-[11px] font-bold text-slate-200 transition backdrop-blur shadow-lg inline-flex items-center gap-1.5"
                  title="Download current page as image"
                >
                  <WhiteboardIcon name="save" className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>

                {/* Export Multi-Page PDF Notes */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="rounded-xl border border-white/10 bg-[#0B1536]/90 hover:bg-[#1356E8] px-2.5 py-1 text-[11px] font-bold text-slate-200 transition backdrop-blur shadow-lg flex items-center gap-1.5"
                  title="Download all whiteboard pages as a multi-page PDF document"
                >
                  <WhiteboardIcon name="file-text" className="h-3.5 w-3.5" />
                  <span>PDF Notes</span>
                </button>

                {onShareToChat && (
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (canvas) onShareToChat(canvas.toDataURL("image/png"));
                    }}
                    className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-2.5 py-1 text-[11px] font-black text-white shadow-md transition inline-flex items-center gap-1.5"
                    title="Share whiteboard snapshot directly into live classroom chat"
                  >
                    <WhiteboardIcon name="chat" className="h-3.5 w-3.5" />
                    <span>Share to Chat</span>
                  </button>
                )}
              </footer>
            )}
          </main>
        </div>

        {/* ================================================================== */}
        {/* TEXT & MATH FORMULA INSERTION MODAL */}
        {/* ================================================================== */}
        {textPromptOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0B1536] p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <WhiteboardIcon name="text" className="h-4 w-4 text-blue-400" />
                  <span>Insert Text &amp; Formula Annotation</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setTextPromptOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                >
                  <WhiteboardIcon name="close" className="h-4 w-4" />
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

        {/* ================================================================== */}
        {/* STEM SCIENCE & MATHEMATICS STUDIO MODAL (Stage 4) */}
        {/* ================================================================== */}
        {showStemModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0B1536] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <WhiteboardIcon name="flask" className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-base font-black text-white">
                    STEM &amp; Science Teaching Studio
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStemModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <WhiteboardIcon name="close" className="h-4 w-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setStemTab("formulas")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    stemTab === "formulas"
                      ? "bg-[#1356E8] text-white shadow"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <WhiteboardIcon name="math" className="h-3.5 w-3.5" />
                  <span>Formulas (KaTeX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStemTab("physics")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    stemTab === "physics"
                      ? "bg-[#1356E8] text-white shadow"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <WhiteboardIcon name="physics" className="h-3.5 w-3.5" />
                  <span>Physics &amp; Circuits</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStemTab("chemistry")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    stemTab === "chemistry"
                      ? "bg-[#1356E8] text-white shadow"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <WhiteboardIcon name="flask" className="h-3.5 w-3.5" />
                  <span>Chemistry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStemTab("biology")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    stemTab === "biology"
                      ? "bg-[#1356E8] text-white shadow"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <WhiteboardIcon name="biology" className="h-3.5 w-3.5" />
                  <span>Biology &amp; Cells</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStemTab("simulations")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                    stemTab === "simulations"
                      ? "bg-[#1356E8] text-white shadow"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <WhiteboardIcon name="chart" className="h-3.5 w-3.5" />
                  <span>Simulations (Liveboard)</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {stemTab === "formulas" && (
                  <div className="space-y-4">
                    {/* Live Rendered LaTeX Box */}
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Live LaTeX Equation Preview
                      </span>
                      <div className="min-h-16 rounded-xl border border-white/10 bg-[#070d1e] p-4 flex items-center justify-center text-cyan-300 overflow-x-auto text-lg shadow-inner">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: renderLatexToHtml(customLatex || "x"),
                          }}
                        />
                      </div>
                    </div>

                    {/* Formula Editor Input */}
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        LaTeX Code Input
                      </span>
                      <textarea
                        value={customLatex}
                        onChange={(e) => setCustomLatex(e.target.value)}
                        rows={2}
                        placeholder="e.g. x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
                        className="w-full rounded-xl border border-white/15 bg-[#070d1e] p-3 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Quick STEM Presets */}
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Standard Academic STEM Presets (Click to load)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {STEM_FORMULA_PRESETS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setCustomLatex(p.latex)}
                            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left hover:bg-white/10 hover:border-blue-500/50 transition group"
                          >
                            <div className="text-xs font-bold text-white group-hover:text-cyan-400 flex items-center justify-between">
                              <span>{p.name}</span>
                              <span className="text-[10px] uppercase text-slate-400">
                                {p.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                              {p.latex}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => insertFormula(customLatex)}
                        className="rounded-xl bg-[#1356E8] hover:bg-blue-600 px-5 py-2 text-xs font-black text-white shadow-lg flex items-center gap-2"
                      >
                        <WhiteboardIcon name="math" className="h-3.5 w-3.5" />
                        <span>Insert Formula on Liveboard</span>
                      </button>
                    </div>
                  </div>
                )}

                {stemTab === "simulations" && (
                  <div className="space-y-3">
                    {(
                      [
                        {
                          id: "quadratic" as const,
                          icon: "chart",
                          title: "Quadratic Function & Graph Explorer",
                          subject: "Mathematics",
                          curriculum: "WAEC / JAMB / GCSE Mathematics",
                          desc: "Parabolic curve explorer for y = ax² + bx + c. Live discriminant calculation (Δ), roots, vertex tracking, and 20fps tutor-to-student synchronization.",
                        },
                        {
                          id: "projectile" as const,
                          icon: "rocket",
                          title: "Projectile Motion Simulator",
                          subject: "Physics",
                          curriculum: "WAEC / JAMB / GCSE Physics",
                          desc: "Two-dimensional kinematic trajectory simulation with customizable velocity, launch angle, elevation, and Earth/Moon/Mars gravity presets.",
                        },
                        {
                          id: "circuit" as const,
                          icon: "physics",
                          title: "Ohm's Law & DC Circuit Lab",
                          subject: "Physics",
                          curriculum: "WAEC / JAMB / GCSE Physics",
                          desc: "Interactive DC circuit loop modeling V = IR and power dissipation P = VI across single, series, and parallel resistor configurations.",
                        },
                        {
                          id: "titration" as const,
                          icon: "flask",
                          title: "Acid-Base Titration Simulator",
                          subject: "Chemistry",
                          curriculum: "WAEC / JAMB / GCSE Chemistry",
                          desc: "Volumetric titration modeling neutralization curves (pH vs. V_NaOH), equivalence points, and indicator color transitions.",
                        },
                        {
                          id: "genetics" as const,
                          icon: "biology",
                          title: "Mendelian Genetics & Punnett Square Lab",
                          subject: "Biology",
                          curriculum: "WAEC / JAMB / GCSE Biology",
                          desc: "2x2 monohybrid cross modeling Mendel's Law of Segregation, genotypic 1:2:1 ratios, and phenotypic percentage probability distributions.",
                        },
                      ]
                    ).map((sim) => (
                      <div
                        key={sim.id}
                        className="rounded-xl border border-white/10 bg-[#070d1e] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/50 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <WhiteboardIcon name={sim.icon} className="h-4 w-4 text-cyan-400" />
                            <span className="text-sm font-bold text-white">{sim.title}</span>
                            <span className="rounded bg-blue-500/20 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5">
                              {sim.subject}
                            </span>
                            <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5">
                              Mode A
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">{sim.desc}</p>
                          <div className="text-[10px] text-slate-400">Curriculum: {sim.curriculum}</div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setStemPresenterInitialSim(sim.id);
                            setShowStemModal(false);
                            toggleStemLivePresenter(true);
                          }}
                          className="self-end sm:self-center shrink-0 rounded-xl bg-[#1356E8] hover:bg-blue-600 px-3.5 py-2 text-xs font-black text-white shadow-lg flex items-center gap-1.5 transition"
                        >
                          <WhiteboardIcon name="rocket" className="h-3.5 w-3.5" />
                          <span>Present on Liveboard</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {stemTab !== "formulas" && stemTab !== "simulations" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SCIENCE_DIAGRAM_PRESETS.filter((d) => d.category === stemTab).map(
                      (diagram) => (
                        <div
                          key={diagram.id}
                          className="rounded-xl border border-white/10 bg-[#070d1e] p-4 flex flex-col justify-between hover:border-blue-500/50 transition"
                        >
                          <div>
                            <div className="text-sm font-black text-white mb-1">
                              {diagram.name}
                            </div>
                            <p className="text-xs text-slate-400">
                              {diagram.description}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                            <button
                              type="button"
                              onClick={() => insertDiagramPreset(diagram)}
                              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white shadow"
                            >
                              Insert Diagram
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

SmartWhiteboard.displayName = "SmartWhiteboard";
