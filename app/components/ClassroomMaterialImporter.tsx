"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import type { WhiteboardPage, WhiteboardElement } from "./SmartWhiteboard";
import { detectDocumentAspectRatio } from "./classroom/whiteboard/pdfService";

export interface LessonAttachment {
  id: string;
  name: string;
  size: number;
  url: string;
  type: string;
  uploadedAt: string;
}

interface ClassroomMaterialImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPages: (newPages: WhiteboardPage[], replaceExisting?: boolean) => void;
  onAddAttachment?: (attachment: LessonAttachment) => void;
  attachments?: LessonAttachment[];
  onRemoveAttachment?: (id: string) => void;
  authToken?: string;
}

export default function ClassroomMaterialImporter({
  isOpen,
  onClose,
  onAddPages,
  onAddAttachment,
  attachments = [],
  onRemoveAttachment,
  authToken = "",
}: ClassroomMaterialImporterProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "slides" | "outline" | "handouts">("csv");

  // CSV State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvError, setCsvError] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Slide Images State
  const [slideImages, setSlideImages] = useState<{ name: string; dataUrl: string; aspectRatio: "16 / 9" | "4 / 3" | "9 / 16" | "free" }[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Outline State
  const [outlineText, setOutlineText] = useState("");

  // Handout Upload State
  const [uploadingHandout, setUploadingHandout] = useState(false);
  const [handoutError, setHandoutError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const handoutInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // 1. CSV PARSING & WHITEBOARD PAGE GENERATION
  // --------------------------------------------------------------------------
  function handleCsvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setCsvError(`CSV Parsing error: ${results.errors[0]?.message || "Check file formatting"}`);
          return;
        }

        const data = results.data as Record<string, string>[];
        if (!data || data.length === 0) {
          setCsvError("The selected CSV file contains no data rows.");
          return;
        }

        setCsvData(data);
        setCsvHeaders(Object.keys(data[0] || {}));
      },
      error: (err) => {
        setCsvError(`Failed to read CSV: ${err.message}`);
      },
    });
  }

  function generatePagesFromCsv() {
    if (csvData.length === 0) return;

    // Detect column mappings case-insensitively
    const findCol = (regex: RegExp) => csvHeaders.find((h) => regex.test(h)) || "";
    const questionCol = findCol(/question|prompt|item/i);
    const optACol = findCol(/option_?a|choice_?a|opt_?a/i);
    const optBCol = findCol(/option_?b|choice_?b|opt_?b/i);
    const optCCol = findCol(/option_?c|choice_?c|opt_?c/i);
    const optDCol = findCol(/option_?d|choice_?d|opt_?d/i);
    const ansCol = findCol(/answer|correct|key/i);
    const expCol = findCol(/explanation|rationale|solution/i);
    const topicCol = findCol(/topic|subject|unit/i);

    const generated: WhiteboardPage[] = [];

    // Is it a question bank format?
    const isQuestionFormat = Boolean(questionCol && (optACol || optBCol));

    if (isQuestionFormat) {
      csvData.forEach((row, idx) => {
        const qText = row[questionCol] || `Question ${idx + 1}`;
        const optA = optACol ? row[optACol] : "";
        const optB = optBCol ? row[optBCol] : "";
        const optC = optCCol ? row[optCCol] : "";
        const optD = optDCol ? row[optDCol] : "";
        const ans = ansCol ? row[ansCol] : "";
        const topic = topicCol ? row[topicCol] : "Past Question";

        const elements: WhiteboardElement[] = [];

        // Question Card Background
        elements.push({
          id: `rect-q-${idx}`,
          type: "rect",
          color: "#1e293b",
          width: 2,
          startX: 60,
          startY: 60,
          endX: 1140,
          endY: 220,
        });

        // Question Title / Topic Badge
        elements.push({
          id: `title-${idx}`,
          type: "text",
          color: "#38bdf8",
          width: 2,
          startX: 80,
          startY: 100,
          text: `Q${idx + 1} · ${topic.toUpperCase()}`,
          fontSize: 18,
        });

        // Question Prompt
        elements.push({
          id: `text-q-${idx}`,
          type: "text",
          color: "#ffffff",
          width: 2,
          startX: 80,
          startY: 150,
          text: qText.length > 90 ? `${qText.slice(0, 87)}...` : qText,
          fontSize: 22,
        });

        // Options
        const optionsList = [
          { letter: "A", text: optA, y: 260 },
          { letter: "B", text: optB, y: 330 },
          { letter: "C", text: optC, y: 400 },
          { letter: "D", text: optD, y: 470 },
        ];

        optionsList.forEach((opt, optIdx) => {
          if (!opt.text) return;
          const isCorrect = ans && ans.trim().toUpperCase() === opt.letter;

          elements.push({
            id: `rect-opt-${idx}-${optIdx}`,
            type: "rect",
            color: isCorrect ? "#059669" : "#334155",
            width: isCorrect ? 2.5 : 1.5,
            startX: 80,
            startY: opt.y - 30,
            endX: 1120,
            endY: opt.y + 25,
          });

          elements.push({
            id: `text-opt-${idx}-${optIdx}`,
            type: "text",
            color: isCorrect ? "#34d399" : "#e2e8f0",
            width: 2,
            startX: 110,
            startY: opt.y + 6,
            text: `[${opt.letter}]  ${opt.text}`,
            fontSize: 18,
          });
        });

        generated.push({
          id: `page-q-${Date.now()}-${idx}`,
          title: `Q${idx + 1} · ${topic || "Practice Question"}`,
          aspectRatio: "16 / 9",
          backgroundMode: "blackboard",
          elements,
        });
      });
    } else {
      // General Tabular / Lecture Outline Format
      csvData.slice(0, 30).forEach((row, idx) => {
        const elements: WhiteboardElement[] = [];
        const keys = Object.keys(row);
        const titleKey = keys[0];
        const titleVal = titleKey ? row[titleKey] : `Slide ${idx + 1}`;

        elements.push({
          id: `title-t-${idx}`,
          type: "text",
          color: "#38bdf8",
          width: 2,
          startX: 80,
          startY: 90,
          text: String(titleVal || `Section ${idx + 1}`),
          fontSize: 28,
        });

        let curY = 170;
        keys.slice(1, 6).forEach((k, kIdx) => {
          if (!row[k]) return;
          elements.push({
            id: `pt-${idx}-${kIdx}`,
            type: "text",
            color: "#f8fafc",
            width: 2,
            startX: 100,
            startY: curY,
            text: `• ${k.toUpperCase()}: ${row[k]}`,
            fontSize: 20,
          });
          curY += 60;
        });

        generated.push({
          id: `page-tbl-${Date.now()}-${idx}`,
          title: String(titleVal || `Slide ${idx + 1}`),
          aspectRatio: "free",
          backgroundMode: "blackboard",
          elements,
        });
      });
    }

    onAddPages(generated, replaceExisting);
    onClose();
  }

  // --------------------------------------------------------------------------
  // 2. POWERPOINT SLIDES & IMAGE DECK IMPORT
  // --------------------------------------------------------------------------
  async function handleSlideImagesSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoadingImages(true);
    const loaded: { name: string; dataUrl: string; aspectRatio: "16 / 9" | "4 / 3" | "9 / 16" | "free" }[] = [];

    // Sort files naturally by filename so slide1, slide2, slide3 stay in order
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));

    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      let finalUrl = "";
      try {
        const formData = new FormData();
        formData.append("file", f);
        formData.append("mediaType", "image");
        // These are tutor-owned Studio materials, not uploads to a live class.
        // The shared-assets scope is restricted to verified teaching staff.
        formData.append("classId", "classroom-assets");

        const res = await fetch("/api/classroom/upload", {
          method: "POST",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: formData,
        });

        if (res.ok) {
          const json = await res.json();
          if (json.url) {
            finalUrl = json.url;
          }
        }
      } catch (err) {
        console.warn("Storage upload failed for slide, using fallback URL:", err);
      }

      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        });
      }

      // Detect natural aspect ratio to avoid distortion
      let detectedAspect: "16 / 9" | "4 / 3" | "9 / 16" | "free" = "free";
      if (typeof Image !== "undefined") {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            detectedAspect = detectDocumentAspectRatio(img.naturalWidth, img.naturalHeight);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = finalUrl;
        });
      }

      loaded.push({ name: f.name, dataUrl: finalUrl, aspectRatio: detectedAspect });
    }

    setSlideImages(loaded);
    setLoadingImages(false);
  }

  function generatePagesFromSlideImages() {
    if (slideImages.length === 0) return;

    const newPages: WhiteboardPage[] = slideImages.map((s, idx) => ({
      id: `page-slide-${Date.now()}-${idx}`,
      title: `Slide ${idx + 1} (${s.name.replace(/\.[^/.]+$/, "")})`,
      aspectRatio: s.aspectRatio || "free",
      backgroundMode: "whiteboard",
      backgroundImage: s.dataUrl,
      elements: [],
    }));

    onAddPages(newPages, replaceExisting);
    onClose();
  }

  // --------------------------------------------------------------------------
  // 3. OUTLINE / WORD DOCUMENT TEXT IMPORT
  // --------------------------------------------------------------------------
  function generatePagesFromOutline() {
    if (!outlineText.trim()) return;

    // Split on markdown headers or slide delimiters
    const chunks = outlineText
      .split(/(?=^#\s+|^Slide\s+\d+:?|^---)/gim)
      .map((c) => c.trim())
      .filter(Boolean);

    const generated: WhiteboardPage[] = chunks.map((chunk, idx) => {
      const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
      const titleLine = lines[0]?.replace(/^[#\s\-*]+/, "") || `Slide ${idx + 1}`;
      const contentLines = lines.slice(1);

      const elements: WhiteboardElement[] = [];

      // Header title
      elements.push({
        id: `out-title-${idx}`,
        type: "text",
        color: "#38bdf8",
        width: 2,
        startX: 80,
        startY: 90,
        text: titleLine,
        fontSize: 28,
      });

      let y = 160;
      contentLines.slice(0, 7).forEach((l, lIdx) => {
        elements.push({
          id: `out-line-${idx}-${lIdx}`,
          type: "text",
          color: "#f8fafc",
          width: 2,
          startX: 90,
          startY: y,
          text: l.startsWith("•") || l.startsWith("-") ? l : `• ${l}`,
          fontSize: 20,
        });
        y += 55;
      });

      return {
        id: `page-outline-${Date.now()}-${idx}`,
        title: titleLine.slice(0, 30),
        aspectRatio: "free",
        backgroundMode: "blackboard",
        elements,
      };
    });

    onAddPages(generated, replaceExisting);
    onClose();
  }

  // --------------------------------------------------------------------------
  // 4. LESSON DOCUMENT HANDOUT UPLOAD (.pptx, .docx, .pdf, .csv)
  // --------------------------------------------------------------------------
  async function handleHandoutUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHandout(true);
    setHandoutError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      // Studio lessons are not live_classes. Use the verified-staff shared-assets
      // scope; lesson ownership is enforced by the Studio save/read endpoints.
      formData.append("classId", "classroom-assets");
      formData.append("mediaType", "document");

      const res = await fetch("/api/classroom/upload", {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document handout.");
      }

      if (onAddAttachment) {
        onAddAttachment({
          id: data.assetId || crypto.randomUUID(),
          name: data.fileName || file.name,
          size: data.fileSize || file.size,
          url: data.url || `/api/classroom/media/${data.assetId}`,
          type: file.type || "application/octet-stream",
          uploadedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setHandoutError(err instanceof Error ? err.message : "Handout upload failed.");
    } finally {
      setUploadingHandout(false);
      if (handoutInputRef.current) handoutInputRef.current.value = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl border border-white/10 bg-[#0B1536] text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#071127] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 text-xl text-blue-400">
              📥
            </span>
            <div>
              <h3 className="text-base font-black text-white">Import Lesson Materials &amp; Slides</h3>
              <p className="text-xs text-slate-400">
                Prepare slides from CSV questions, PowerPoint decks, or Word notes before going live.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/10 bg-[#071127]/50 px-5 text-xs font-bold">
          <button
            onClick={() => setActiveTab("csv")}
            className={`py-3 px-3 transition border-b-2 ${
              activeTab === "csv"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            📊 Past Questions (CSV)
          </button>
          <button
            onClick={() => setActiveTab("slides")}
            className={`py-3 px-3 transition border-b-2 ${
              activeTab === "slides"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            🖼️ PowerPoint Decks (.pptx images)
          </button>
          <button
            onClick={() => setActiveTab("outline")}
            className={`py-3 px-3 transition border-b-2 ${
              activeTab === "outline"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            📝 Word Notes &amp; Outline
          </button>
          <button
            onClick={() => setActiveTab("handouts")}
            className={`py-3 px-3 transition border-b-2 ${
              activeTab === "handouts"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            📎 Class Handouts ({attachments.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CSV QUESTIONS */}
          {activeTab === "csv" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow transition"
                >
                  📁 Select CSV File
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Upload a spreadsheet containing questions (<code className="text-blue-300">question, option_a, option_b...</code>) or topic outlines.
                </p>
                {csvFile && (
                  <p className="mt-2 font-mono text-xs font-bold text-emerald-400">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {csvError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {csvError}
                </div>
              )}

              {csvData.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Detected {csvData.length} records · {csvHeaders.length} columns
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Ready to generate
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-900 p-3 text-xs font-mono text-slate-300 max-h-32 overflow-y-auto">
                    <p className="text-[11px] text-slate-500 font-bold mb-1">Preview Row 1:</p>
                    {JSON.stringify(csvData[0], null, 2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: POWERPOINT DECK & SLIDE IMAGES */}
          {activeTab === "slides" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4 text-xs text-blue-200 leading-relaxed">
                <span className="font-bold">💡 How to import your PowerPoint slides:</span>
                <p className="mt-1">
                  In PowerPoint, select <code className="bg-blue-900/40 px-1 py-0.5 rounded font-mono">File → Export → Change File Type → PNG or JPEG</code>, then select <em>&quot;All Slides&quot;</em>. Select those exported slide images below to load each slide directly onto your interactive whiteboard.
                </p>
              </div>

              <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  ref={imageInputRef}
                  onChange={handleSlideImagesSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow transition"
                >
                  🖼️ Select Slide Images (Multiple)
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Select all slide images at once. They will be ordered naturally by slide number.
                </p>
                {loadingImages && <p className="mt-2 text-xs text-blue-400 animate-pulse">Processing slide images...</p>}
              </div>

              {slideImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{slideImages.length} Slides Loaded</span>
                    <button
                      onClick={() => setSlideImages([])}
                      className="text-rose-400 hover:underline text-[11px]"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                    {slideImages.map((s, idx) => (
                      <div key={idx} className="relative rounded-lg border border-white/20 overflow-hidden bg-black aspect-video flex flex-col items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.dataUrl} alt={s.name} className="h-full w-full object-cover" />
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[9px] font-bold text-white">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OUTLINE / WORD TEXT */}
          {activeTab === "outline" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Paste Presentation Notes, Word Outline, or Markdown
                </label>
                <textarea
                  rows={8}
                  value={outlineText}
                  onChange={(e) => setOutlineText(e.target.value)}
                  placeholder={`# Slide 1: Introduction to Organic Chemistry
- Definition of Hydrocarbons
- Saturated vs Unsaturated Compounds

# Slide 2: Alkanes & General Formula
- CnH2n+2 Series
- Combustion reactions and volatility

# Slide 3: Practical Exam Problems
- Solving structural isomerism for Pentane`}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 p-4 text-xs font-mono text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Use <code className="text-blue-300"># Title</code> or <code className="text-blue-300">Slide N:</code> to separate each slide page.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: HANDOUTS */}
          {activeTab === "handouts" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
                <input
                  type="file"
                  accept=".pptx,.docx,.pdf,.csv,.doc,.ppt"
                  ref={handoutInputRef}
                  onChange={handleHandoutUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingHandout}
                  onClick={() => handoutInputRef.current?.click()}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-50"
                >
                  {uploadingHandout ? "Uploading Handout..." : "📎 Upload Master Deck / Handout (.pptx, .docx, .pdf)"}
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Upload your full PowerPoint or Word file. Students will be able to download it during class.
                </p>
              </div>

              {handoutError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {handoutError}
                </div>
              )}

              {attachments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Attached Class Materials ({attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📄</span>
                          <div>
                            <p className="font-bold text-white">{att.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {(att.size / (1024 * 1024)).toFixed(2)} MB · Uploaded {new Date(att.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-blue-600/20 px-2.5 py-1 text-[11px] font-bold text-blue-300 hover:bg-blue-600/30"
                          >
                            Preview
                          </a>
                          {onRemoveAttachment && (
                            <button
                              onClick={() => onRemoveAttachment(att.id)}
                              className="rounded-lg p-1 text-slate-500 hover:text-rose-400"
                              title="Remove"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Replacement Toggle (for tabs 1, 2, 3) */}
          {activeTab !== "handouts" && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
              />
              Replace existing whiteboard pages (uncheck to append to current pages)
            </label>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#071127] p-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10"
          >
            Cancel
          </button>

          {activeTab === "csv" && (
            <button
              onClick={generatePagesFromCsv}
              disabled={csvData.length === 0}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-40"
            >
              ✨ Generate Whiteboard Slides from CSV ({csvData.length})
            </button>
          )}

          {activeTab === "slides" && (
            <button
              onClick={generatePagesFromSlideImages}
              disabled={slideImages.length === 0}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-40"
            >
              ✨ Add {slideImages.length} Slides to Whiteboard
            </button>
          )}

          {activeTab === "outline" && (
            <button
              onClick={generatePagesFromOutline}
              disabled={!outlineText.trim()}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow transition disabled:opacity-40"
            >
              ✨ Generate Slide Pages from Outline
            </button>
          )}

          {activeTab === "handouts" && (
            <button
              onClick={onClose}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-bold text-white shadow transition"
            >
              Done &amp; Return to Studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
