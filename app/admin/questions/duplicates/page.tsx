"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAdminSession } from "../../../lib/adminAuth";
import { adminHasPermission } from "../../../lib/adminRoles";
import { detectDuplicates, generateWordDiff, scoreQuestionQuality, archiveQuestionSafely } from "../../../lib/examEngine/duplicateDetector";
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
  const [message, setMessage] = useState("");
  const [adminEmail, setAdminEmail] = useState("admin@brainlabacademy.com.ng");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const session = await getAdminSession();
        if (session?.email) setAdminEmail(session.email);

        const { data: rows, error } = await supabase
          .from("questions")
          .select("*")
          .eq("is_active", true)
          .limit(1500);

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

  async function handleArchive(questionId: number) {
    if (!confirm(`Are you sure you want to safely archive Question #${questionId}? It will be removed from new examination generation while preserving completed student attempts.`)) {
      return;
    }
    setActionLoading(true);
    const res = await archiveQuestionSafely(
      questionId,
      adminEmail,
      `Deactivated via Duplicate Questions Manager (Group ${activeGroup?.hash || "unknown"})`
    );
    setActionLoading(false);
    if (res.ok) {
      setMessage(res.message);
      // Remove question from active state
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } else {
      setMessage(res.message || "Archival failed.");
    }
  }

  return (
    <div className="admin-page-container">
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
            Intelligent detection of exact matches and near-duplicates with side-by-side comparison, difference highlighting, and safe archival.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/questions/manage"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ← Question Bank
          </Link>
          <Link
            href="/admin/questions/high-yield"
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ⭐ High-Yield Topics
          </Link>
        </div>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-900">
          {message}
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
          {(["all", "exact", "likely", "potential"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setFilterType(t);
                setActiveGroupIndex(0);
              }}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold capitalize transition-all ${
                filterType === t
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-xs font-bold text-slate-600">Scanning Question Bank for Duplicates &amp; Similarity...</p>
        </div>
      ) : duplicateGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <span className="text-4xl" aria-hidden="true">🎉</span>
          <h3 className="text-base font-bold text-slate-900 mt-2">Zero Unresolved Duplicates Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            The question bank in {selectedSubject} satisfies integrity criteria. No exact matches or high-similarity clusters were detected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Groups List Sidebar */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Suspected Duplicate Groups ({duplicateGroups.length})
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {duplicateGroups.map((g, idx) => {
                const isSelected = idx === activeGroupIndex;
                const sampleQ = g.questions[0];

                return (
                  <button
                    key={g.hash}
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

                          {!isRecommended && (
                            <button
                              type="button"
                              onClick={() => handleArchive(q.id)}
                              disabled={actionLoading}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Archive Duplicate
                            </button>
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
    </div>
  );
}
