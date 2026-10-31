"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminSession } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { detectDuplicates, generateWordDiff, scoreQuestionQuality } from "../../../lib/examEngine/duplicateDetector";
import { DuplicateGroup, EngineQuestion } from "../../../lib/examEngine/types";
import { supabase } from "../../../lib/supabase";
import "../../admin.css";

export default function DuplicateQuestionsAdminPage() {
  const [questions, setQuestions] = useState<EngineQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [filterType, setFilterType] = useState<"all" | "exact" | "likely" | "potential">("all");
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [adminEmail, setAdminEmail] = useState("admin@brainlabacademy.com.ng");
  const [canManageQuestions, setCanManageQuestions] = useState(true);

  // Bulk action confirmation modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"exact_only" | "all_filtered">("exact_only");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const session = await getAdminSession();
        if (session?.email) setAdminEmail(session.email);
        if (session) {
          const hasPerm = await adminHasPermission("cbt.questions.manage");
          setCanManageQuestions(hasPerm);
        }

        const { data: rows } = await supabase
          .from("questions")
          .select("*")
          .eq("is_active", true)
          .limit(2000);

        if (rows) {
          setQuestions(rows as EngineQuestion[]);
        }
      } catch (err) {
        console.error("Failed to load questions:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  // Filter questions by subject
  const subjectFilteredQuestions = useMemo(() => {
    if (selectedSubject === "All") return questions;
    return questions.filter(
      (q) => (q.subject || "").toLowerCase() === selectedSubject.toLowerCase()
    );
  }, [questions, selectedSubject]);

  // Run duplicate detector on the filtered questions
  const duplicateGroups = useMemo(() => {
    const detected = detectDuplicates(subjectFilteredQuestions);
    if (filterType === "all") return detected;
    return detected.filter((g) => g.type === filterType);
  }, [subjectFilteredQuestions, filterType]);

  const activeGroup: DuplicateGroup | undefined = duplicateGroups[activeGroupIndex];

  // Calculate bulk candidates
  const bulkPreview = useMemo(() => {
    const targetGroups = duplicateGroups.filter((g) =>
      bulkMode === "exact_only" ? g.type === "exact" : true
    );

    const groupsPayload = targetGroups.map((g) => {
      const retainId = g.recommendedRetainId;
      const archiveIds = g.questions.map((q) => q.id).filter((id) => id !== retainId);
      return {
        hash: g.hash,
        subject: g.questions[0]?.subject || "General",
        retainId,
        archiveIds,
      };
    }).filter((g) => g.archiveIds.length > 0);

    const totalToArchive = groupsPayload.reduce((acc, g) => acc + g.archiveIds.length, 0);
    const totalToPreserve = groupsPayload.length;

    return {
      groups: groupsPayload,
      targetGroupsCount: targetGroups.length,
      totalToArchive,
      totalToPreserve,
    };
  }, [duplicateGroups, bulkMode]);

  async function handleArchiveSingle(questionId: number) {
    if (!activeGroup) return;

    // Safety check: ensure at least one question remains in this group
    const remainingInGroup = activeGroup.questions.filter((q) => q.id !== questionId);
    if (remainingInGroup.length === 0) {
      alert("Safety Rule: Every duplicate group must preserve at least one question. You cannot delete all records in a group.");
      return;
    }

    if (!confirm(`Are you sure you want to safely archive Question #${questionId}? It will be excluded from future CBT exam generation while preserving past completed student scores.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/questions/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive_single",
          questionId,
          groupHash: activeGroup.hash,
          reason: `Deactivated via Duplicate Questions Manager (Group ${activeGroup.hash})`,
        }),
      }).then((r) => r.json());

      if (res.ok) {
        setMessage({ type: "success", text: res.message });
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      } else {
        setMessage({ type: "error", text: res.message || "Archival failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Network error." });
    } finally {
      setActionLoading(false);
    }
  }

  async function executeBulkArchive() {
    if (bulkPreview.totalToArchive === 0) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/questions/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "archive_bulk",
          groups: bulkPreview.groups,
          reason: `Bulk duplicate resolution (${bulkMode}) by ${adminEmail}`,
        }),
      }).then((r) => r.json());

      if (res.ok) {
        setMessage({ type: "success", text: res.message });
        const archivedSet = new Set(res.archivedIds || []);
        setQuestions((prev) => prev.filter((q) => !archivedSet.has(q.id)));
        setBulkModalOpen(false);
        setActiveGroupIndex(0);
      } else {
        setMessage({ type: "error", text: res.message || "Bulk resolution failed." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Network error." });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link href="/admin/dashboard" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link href="/admin/questions/manage" className="hover:text-blue-600">Questions</Link>
            <span>/</span>
            <span className="text-slate-800">Duplicate Manager</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Duplicate Questions Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Intelligent detection of 100% exact matches and near-duplicates with side-by-side comparison, difference highlighting, and safe archival.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {duplicateGroups.length > 0 && canManageQuestions && (
            <button
              type="button"
              onClick={() => {
                setBulkMode("exact_only");
                setBulkModalOpen(true);
              }}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              <span>Bulk Resolve Duplicates</span>
            </button>
          )}

          <Link
            href="/admin/questions/manage"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Question Bank
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-xl border p-3.5 text-xs font-bold flex items-center justify-between gap-2 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          }`}
        >
          <span>{message.text}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">Subject:</span>
          {["All", "English", "Mathematics", "Chemistry", "Physics", "Biology"].map((subj) => (
            <button
              key={subj}
              type="button"
              onClick={() => {
                setSelectedSubject(subj);
                setActiveGroupIndex(0);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedSubject === subj
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">Match Type:</span>
          {[
            { id: "all", label: "All Types" },
            { id: "exact", label: "Exact (100%)" },
            { id: "likely", label: "Likely (≥85%)" },
            { id: "potential", label: "Potential (≥70%)" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setFilterType(t.id as typeof filterType);
                setActiveGroupIndex(0);
              }}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                filterType === t.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-3" />
          <p className="text-sm font-bold text-slate-700">Scanning question bank for duplicate patterns...</p>
        </div>
      ) : duplicateGroups.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-12 text-center shadow-sm">
          <span className="text-3xl mb-2 block">✓</span>
          <h2 className="text-base font-bold text-emerald-950">Clean Question Bank</h2>
          <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
            No duplicate questions detected matching {selectedSubject} ({filterType}). All question records appear unique.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Duplicate Groups List */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[750px]">
            <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Duplicate Clusters ({duplicateGroups.length})
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {duplicateGroups.reduce((acc, g) => acc + g.questions.length, 0)} total records
              </span>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {duplicateGroups.map((g, idx) => {
                const isSelected = idx === activeGroupIndex;
                const sampleQ = g.questions[0];

                return (
                  <button
                    key={g.hash || idx}
                    type="button"
                    onClick={() => setActiveGroupIndex(idx)}
                    className={`w-full text-left p-3.5 transition-colors ${
                      isSelected ? "bg-blue-50/80 border-l-4 border-blue-600" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase ${
                          g.type === "exact"
                            ? "bg-rose-100 text-rose-800"
                            : g.type === "likely"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {g.type} ({Math.round(g.similarityScore * 100)}%)
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {g.questions.length} records
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                      {sampleQ?.question}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {sampleQ?.subject} · {sampleQ?.category || "General"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side-by-Side Comparison Area */}
          <div className="lg:col-span-8 space-y-6">
            {activeGroup && (
              <>
                {/* Group Header & Recommendation */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-extrabold uppercase text-blue-900 tracking-wider">
                      Intelligence Recommendation
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      Match Score: {Math.round(activeGroup.similarityScore * 100)}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    {activeGroup.reasons.map((r, i) => (
                      <p key={i} className="text-xs font-medium text-blue-800">
                        • {r}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Diff Viewer if 2 questions */}
                {activeGroup.questions.length === 2 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Prompt Word Diff Visualizer
                    </span>
                    <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed font-mono flex flex-wrap gap-1 border border-slate-200">
                      {generateWordDiff(
                        activeGroup.questions[0].question,
                        activeGroup.questions[1].question
                      ).map((d, i) => (
                        <span
                          key={i}
                          className={
                            d.status === "added"
                              ? "bg-emerald-100 text-emerald-800 px-1 rounded font-bold"
                              : d.status === "removed"
                              ? "bg-rose-100 text-rose-800 line-through px-1 rounded font-bold"
                              : "text-slate-700"
                          }
                        >
                          {d.word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comparison Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeGroup.questions.map((q) => {
                    const isRecommended = q.id === activeGroup.recommendedRetainId;
                    const quality = scoreQuestionQuality(q);

                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl border p-5 shadow-sm transition-all ${
                          isRecommended
                            ? "border-emerald-400 bg-emerald-50/20 ring-1 ring-emerald-300"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              #{q.id}
                            </span>
                            {isRecommended && (
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black uppercase">
                                ★ Recommended to Retain
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            Quality: {quality}/100
                          </span>
                        </div>

                        {/* Prompt */}
                        <div className="mb-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Question Prompt</span>
                          <p className="text-xs font-semibold text-slate-900 mt-0.5">{q.question}</p>
                        </div>

                        {/* Options */}
                        <div className="space-y-1.5 mb-4 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Options</span>
                          <div className={`p-2 rounded-lg ${q.correct_answer === "A" ? "bg-emerald-50 font-bold text-emerald-900 border border-emerald-200" : "bg-slate-50 text-slate-700"}`}>
                            A. {q.option_a}
                          </div>
                          <div className={`p-2 rounded-lg ${q.correct_answer === "B" ? "bg-emerald-50 font-bold text-emerald-900 border border-emerald-200" : "bg-slate-50 text-slate-700"}`}>
                            B. {q.option_b}
                          </div>
                          <div className={`p-2 rounded-lg ${q.correct_answer === "C" ? "bg-emerald-50 font-bold text-emerald-900 border border-emerald-200" : "bg-slate-50 text-slate-700"}`}>
                            C. {q.option_c}
                          </div>
                          <div className={`p-2 rounded-lg ${q.correct_answer === "D" ? "bg-emerald-50 font-bold text-emerald-900 border border-emerald-200" : "bg-slate-50 text-slate-700"}`}>
                            D. {q.option_d}
                          </div>
                          {q.option_e && (
                            <div className={`p-2 rounded-lg ${q.correct_answer === "E" ? "bg-emerald-50 font-bold text-emerald-900 border border-emerald-200" : "bg-slate-50 text-slate-700"}`}>
                              E. {q.option_e}
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="text-[11px] text-slate-500 space-y-1 mb-5">
                          <p><strong className="text-slate-700">Correct Answer:</strong> Option {q.correct_answer}</p>
                          <p><strong className="text-slate-700">Topic:</strong> {q.topic || q.category || "—"}</p>
                          <p><strong className="text-slate-700">Explanation:</strong> {q.explanation || <span className="text-rose-500 italic">None provided</span>}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2">
                          <Link
                            href={`/admin/questions/edit/${q.id}`}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800"
                          >
                            Edit Record ↗
                          </Link>

                          {!isRecommended && canManageQuestions ? (
                            <button
                              type="button"
                              onClick={() => handleArchiveSingle(q.id)}
                              disabled={actionLoading}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Archive Duplicate
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-emerald-700">
                              Canonical Record
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-950">Bulk Duplicate Resolution</h2>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
                  <span>Immutable Preservation Guarantee</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  Every duplicate group will retain at least one verified canonical question record. Deactivated duplicate records will be excluded from new CBT generation while historical student attempts remain fully intact.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Cluster Scope:</label>
                <select
                  value={bulkMode}
                  onChange={(e) => setBulkMode(e.target.value as typeof bulkMode)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-800"
                >
                  <option value="exact_only">100% Exact Duplicates Only</option>
                  <option value="all_filtered">All Filtered Duplicates (Exact + Likely)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Questions to Archive</span>
                  <span className="text-2xl font-black text-rose-600 tabular-nums">{bulkPreview.totalToArchive}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Canonical Preserved</span>
                  <span className="text-2xl font-black text-emerald-600 tabular-nums">{bulkPreview.totalToPreserve}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Action will be audited under your administrator signature: <strong className="text-slate-700">{adminEmail}</strong>.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkArchive}
                disabled={actionLoading || bulkPreview.totalToArchive === 0}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold shadow transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? "Processing Bulk Resolution..." : `Confirm & Archive ${bulkPreview.totalToArchive} Records`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
