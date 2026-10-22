"use client";

import React, { useState } from "react";
import { supabase } from "@/app/lib/supabase";

interface Block {
  id: string;
  lesson_id: string;
  block_type: "text" | "image" | "voice_note" | "short_video" | "long_video" | "inline_mcq";
  content: Record<string, unknown>;
  order_index: number;
}

interface AiLessonAuthorCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  topicTitle: string;
  existingBlocks: Block[];
  onApplyDraft: (draft: {
    title: string;
    summary: string;
    markdownContent: string;
    keyTakeaways?: string[];
  }) => Promise<void> | void;
  onAddMcqBlocks: (
    mcqs: Array<{
      question: string;
      options: Array<{ id: string; text: string }>;
      correct_option_id: string;
      explanation: string;
    }>
  ) => Promise<void> | void;
  onReplaceBlockText: (blockId: string, newText: string) => void;
}

type CopilotTab = "draft" | "mcqs" | "refine" | "review";

export default function AiLessonAuthorCopilot({
  isOpen,
  onClose,
  subjectName,
  topicTitle,
  existingBlocks,
  onApplyDraft,
  onAddMcqBlocks,
  onReplaceBlockText,
}: AiLessonAuthorCopilotProps) {
  const [activeTab, setActiveTab] = useState<CopilotTab>("draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Tab 1: Lesson Draft State
  const [level, setLevel] = useState("UTME/JAMB");
  const [objectives, setObjectives] = useState("");
  const [depth, setDepth] = useState("Detailed with exam examples");
  const [teachingStyle, setTeachingStyle] = useState("Direct, encouraging, exam-oriented");
  const [generatedDraft, setGeneratedDraft] = useState<{
    title: string;
    summary: string;
    estimated_read_time_mins: number;
    markdown_content: string;
    key_takeaways: string[];
    definitions: Array<{ term: string; meaning: string }>;
  } | null>(null);

  // Tab 2: Checkpoint MCQs State
  const [mcqCount, setMcqCount] = useState(3);
  const [mcqDifficulty, setMcqDifficulty] = useState("medium");
  const [mcqSourceBlockId, setMcqSourceBlockId] = useState<string>("all");
  const [generatedMcqs, setGeneratedMcqs] = useState<Array<{
    id: string;
    question: string;
    options: Array<{ id: string; text: string }>;
    correct_option_id: string;
    explanation: string;
  }>>([]);

  // Tab 3: Contextual Refine State
  const [refineBlockId, setRefineBlockId] = useState<string>("");
  const [refineAction, setRefineAction] = useState<string>("rephrase");
  const [customInstruction, setCustomInstruction] = useState("");
  const [refinedOutput, setRefinedOutput] = useState<string | null>(null);

  // Tab 4: Quality Review State
  const [qaFindings, setQaFindings] = useState<Array<{
    id: string;
    category: string;
    severity: "high" | "medium" | "low";
    itemTitle: string;
    issue: string;
    suggestion: string;
  }>>([]);

  if (!isOpen) return null;

  async function callAiAuthor(payload: Record<string, unknown>) {
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("You must be signed in to use the AI Author Copilot.");
      }

      const res = await fetch("/api/admin/ai-author", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || data.error || "AI Authoring request failed.");
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error executing AI author request.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  // 1. Generate Lesson Draft
  async function handleGenerateDraft() {
    const data = await callAiAuthor({
      mode: "generate_lesson",
      subject: subjectName,
      topic: topicTitle,
      level,
      objectives: objectives.trim() || `Core mastery of ${topicTitle}`,
      depth,
      teachingStyle,
    });

    if (data?.lesson) {
      setGeneratedDraft(data.lesson);
      setStatusMessage("Full lesson draft generated successfully! Review below and apply to your builder.");
    }
  }

  // 2. Generate Checkpoint MCQs
  async function handleGenerateMcqs() {
    let sourceText = "";
    if (mcqSourceBlockId === "all") {
      sourceText = existingBlocks
        .filter((b) => b.block_type === "text")
        .map((b) => String(b.content.markdown || b.content.html || ""))
        .join("\n\n");
    } else {
      const found = existingBlocks.find((b) => b.id === mcqSourceBlockId);
      sourceText = String(found?.content.markdown || found?.content.html || "");
    }

    if (!sourceText.trim()) {
      setError("Please select a block with text content or add a text block first.");
      return;
    }

    const data = await callAiAuthor({
      mode: "generate_mcqs",
      sourceText,
      count: mcqCount,
      difficulty: mcqDifficulty,
      subject: subjectName,
      topic: topicTitle,
    });

    if (data?.questions) {
      setGeneratedMcqs(data.questions);
      setStatusMessage(`Generated ${data.questions.length} checkpoint questions!`);
    }
  }

  // 3. Contextual Refine
  async function handleRefineText() {
    const targetBlock = existingBlocks.find((b) => b.id === refineBlockId);
    const sourceText = String(targetBlock?.content.markdown || targetBlock?.content.html || "");

    if (!sourceText.trim()) {
      setError("Please choose a text block with content to refine.");
      return;
    }

    const data = await callAiAuthor({
      mode: "contextual_edit",
      selectedText: sourceText,
      action: refineAction,
      instruction: customInstruction,
      studentLevel: level,
    });

    if (data?.outputText) {
      setRefinedOutput(data.outputText);
      setStatusMessage("Refinement generated! Review the preview below.");
    }
  }

  // 4. Pedagogical QA Review
  async function handleQualityReview() {
    const items = existingBlocks.map((b, i) => ({
      id: b.id,
      index: i + 1,
      type: b.block_type,
      content: b.content,
    }));

    const data = await callAiAuthor({
      mode: "quality_review",
      items,
      topicTitle,
      subjectName,
    });

    if (data?.findings) {
      setQaFindings(data.findings);
      setStatusMessage(`QA Review complete. Found ${data.findings.length} actionable suggestions.`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#061a3a] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-lg font-black text-[#061a3a] shadow-inner">
              ✨
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight">AI Authoring Copilot</h2>
              <p className="text-xs text-cyan-200">
                {subjectName} · {topicTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("draft")}
            className={`border-b-2 py-3 px-4 transition ${
              activeTab === "draft"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            📝 Generate Lesson Note
          </button>
          <button
            onClick={() => setActiveTab("mcqs")}
            className={`border-b-2 py-3 px-4 transition ${
              activeTab === "mcqs"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            🎯 Draft Checkpoint MCQs
          </button>
          <button
            onClick={() => setActiveTab("refine")}
            className={`border-b-2 py-3 px-4 transition ${
              activeTab === "refine"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            🪄 Refine & Transform Text
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`border-b-2 py-3 px-4 transition ${
              activeTab === "review"
                ? "border-blue-600 text-blue-700 bg-white"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            🔍 Pedagogical QA Review
          </button>
        </div>

        {/* Status / Error Alerts */}
        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            ⚠️ {error}
          </div>
        )}
        {statusMessage && (
          <div className="mx-6 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            ✅ {statusMessage}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERATE LESSON DRAFT */}
          {activeTab === "draft" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Target Student Level
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value="UTME/JAMB">JAMB / UTME Standard</option>
                    <option value="WAEC/SSCE">WAEC / WASSCE Standard</option>
                    <option value="Undergraduate">Undergraduate / College</option>
                    <option value="Basic">Foundational / JSS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Teaching Depth
                  </label>
                  <select
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value="Detailed with exam examples">Detailed with exam examples</option>
                    <option value="Concise high-yield revision">Concise high-yield revision</option>
                    <option value="Step-by-step beginner friendly">Step-by-step beginner friendly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Syllabus Objectives / Specific Focus (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`E.g., laws of motion, worked calculation examples, common WAEC traps`}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={loading}
                className="w-full rounded-xl bg-blue-700 py-3 text-xs font-extrabold text-white shadow hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Generating structured lesson note…" : "✨ Generate Full Lesson Note"}
              </button>

              {/* Generated Result Preview */}
              {generatedDraft && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900">{generatedDraft.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ⏱️ ~{generatedDraft.estimated_read_time_mins} min read
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyDraft({
                          title: generatedDraft.title,
                          summary: generatedDraft.summary,
                          markdownContent: generatedDraft.markdown_content,
                          keyTakeaways: generatedDraft.key_takeaways,
                        });
                        onClose();
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 shadow"
                    >
                      🚀 Apply to Lesson Builder
                    </button>
                  </div>

                  <p className="text-xs italic text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                    {generatedDraft.summary}
                  </p>

                  <div className="max-h-60 overflow-y-auto rounded-xl bg-white p-4 text-xs font-mono text-slate-800 border border-slate-200 whitespace-pre-wrap">
                    {generatedDraft.markdown_content}
                  </div>

                  {generatedDraft.key_takeaways?.length > 0 && (
                    <div className="rounded-xl bg-amber-50 p-3 border border-amber-200">
                      <p className="text-xs font-bold text-amber-900 mb-1">🎯 Key Exam Takeaways:</p>
                      <ul className="list-disc pl-4 text-xs text-amber-800 space-y-0.5">
                        {generatedDraft.key_takeaways.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHECKPOINT MCQS */}
          {activeTab === "mcqs" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Source Text Block
                  </label>
                  <select
                    value={mcqSourceBlockId}
                    onChange={(e) => setMcqSourceBlockId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value="all">All Text Blocks in Lesson</option>
                    {existingBlocks
                      .filter((b) => b.block_type === "text")
                      .map((b, idx) => (
                        <option key={b.id} value={b.id}>
                          Block #{idx + 1} ({String(b.content.markdown || "").slice(0, 30)}…)
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Number of Questions
                  </label>
                  <select
                    value={mcqCount}
                    onChange={(e) => setMcqCount(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value={2}>2 Questions</option>
                    <option value={3}>3 Questions</option>
                    <option value={4}>4 Questions</option>
                    <option value={5}>5 Questions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Difficulty
                  </label>
                  <select
                    value={mcqDifficulty}
                    onChange={(e) => setMcqDifficulty(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value="easy">Easy (Knowledge recall)</option>
                    <option value="medium">Medium (Application & conceptual)</option>
                    <option value="hard">Hard (Multi-step exam traps)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateMcqs}
                disabled={loading}
                className="w-full rounded-xl bg-blue-700 py-3 text-xs font-extrabold text-white shadow hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Generating checkpoint questions…" : "🎯 Generate Checkpoint MCQs"}
              </button>

              {/* MCQs Preview */}
              {generatedMcqs.length > 0 && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Generated Questions ({generatedMcqs.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        onAddMcqBlocks(generatedMcqs);
                        onClose();
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 shadow"
                    >
                      ➕ Add All to Lesson Blocks
                    </button>
                  </div>

                  <div className="space-y-3">
                    {generatedMcqs.map((q, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-2"
                      >
                        <p className="font-bold text-slate-900">
                          {idx + 1}. {q.question}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`rounded-lg p-2 border ${
                                opt.id === q.correct_option_id
                                  ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-950"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span className="uppercase font-mono mr-1.5 text-slate-500 font-bold">
                                {opt.id}:
                              </span>
                              {opt.text}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="mt-2 text-[11px] text-slate-600 bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                            💡 <span className="font-semibold">Explanation:</span> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTEXTUAL REFINE */}
          {activeTab === "refine" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Block to Refine
                  </label>
                  <select
                    value={refineBlockId}
                    onChange={(e) => setRefineBlockId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value="">-- Choose a text block --</option>
                    {existingBlocks
                      .filter((b) => b.block_type === "text")
                      .map((b, idx) => (
                        <option key={b.id} value={b.id}>
                          Part #{idx + 1} ({String(b.content.markdown || "").slice(0, 35)}…)
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Refinement Action
                  </label>
                  <select
                    value={refineAction}
                    onChange={(e) => setRefineAction(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                  >
                    <option value="rephrase">Rephrase for maximum clarity</option>
                    <option value="simplify">Simplify for struggling learners</option>
                    <option value="expand">Expand with real-world examples</option>
                    <option value="bullets">Convert into crisp bullet points</option>
                    <option value="table">Convert into comparison table</option>
                    <option value="key_takeaways">Extract key exam takeaways</option>
                    <option value="grammar">Fix grammar and typos</option>
                    <option value="custom">Custom instruction…</option>
                  </select>
                </div>
              </div>

              {refineAction === "custom" && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Custom Prompt / Direction
                  </label>
                  <input
                    type="text"
                    placeholder="E.g., Add an analogy comparing electric current to water flow"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium text-slate-900 focus:border-blue-600 outline-none"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleRefineText}
                disabled={loading || !refineBlockId}
                className="w-full rounded-xl bg-blue-700 py-3 text-xs font-extrabold text-white shadow hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Transforming text…" : "🪄 Transform & Refine Block"}
              </button>

              {refinedOutput && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-sm">Refined Output Preview</h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (refineBlockId) {
                          onReplaceBlockText(refineBlockId, refinedOutput);
                          setStatusMessage("Block updated with refined content!");
                        }
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700 shadow"
                    >
                      💾 Apply to Selected Block
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-xl bg-white p-4 text-xs font-mono text-slate-800 border border-slate-200 whitespace-pre-wrap">
                    {refinedOutput}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PEDAGOGICAL QA REVIEW */}
          {activeTab === "review" && (
            <div className="space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Run an automated audit across all blocks in this lesson for grammatical slips, unclear
                explanations, missing alternatives on media, and pedagogical accuracy against JAMB/WAEC
                standards.
              </p>

              <button
                type="button"
                onClick={handleQualityReview}
                disabled={loading || existingBlocks.length === 0}
                className="w-full rounded-xl bg-blue-700 py-3 text-xs font-extrabold text-white shadow hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? "Auditing lesson content…" : "🔍 Audit Entire Lesson (QA)"}
              </button>

              {qaFindings.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm">
                    QA Findings & Suggestions ({qaFindings.length})
                  </h4>
                  <div className="space-y-2">
                    {qaFindings.map((finding) => (
                      <div
                        key={finding.id}
                        className={`rounded-2xl border p-4 text-xs space-y-1 ${
                          finding.severity === "high"
                            ? "border-rose-300 bg-rose-50/50"
                            : finding.severity === "medium"
                            ? "border-amber-300 bg-amber-50/50"
                            : "border-blue-200 bg-blue-50/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{finding.itemTitle}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                              finding.severity === "high"
                                ? "bg-rose-200 text-rose-950"
                                : finding.severity === "medium"
                                ? "bg-amber-200 text-amber-950"
                                : "bg-blue-200 text-blue-950"
                            }`}
                          >
                            {finding.severity} · {finding.category}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <span className="font-semibold text-slate-900">Issue:</span> {finding.issue}
                        </p>
                        <p className="text-slate-800 font-medium">
                          <span className="font-semibold text-slate-900">Suggestion:</span>{" "}
                          {finding.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Close Copilot
          </button>
        </div>
      </div>
    </div>
  );
}
