"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { supabase } from "../../lib/supabase";
import { getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { isGovernanceAdminRole, isInstructorRole } from "../../lib/adminRoles";

export type QuestionItem = {
  id: number;
  source_question_id: string | null;
  subject: string;
  section: string;
  category: string | null;
  question: string;
  question_image_url?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  option_e?: string | null;
  correct_answer: string;
  explanation?: string | null;
  marks: number;
  difficulty: string | null;
  is_active: boolean;
};

type ViewMode = "browse" | "create" | "import";

export default function TutorQuestionsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("browse");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [subjectsList, setSubjectsList] = useState<string[]>([]);

  // Filtering
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Single Question Creator State
  const [newSubject, setNewSubject] = useState("");
  const [newSection, setNewSection] = useState("General");
  const [newCategory, setNewCategory] = useState("Standard");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newOptionA, setNewOptionA] = useState("");
  const [newOptionB, setNewOptionB] = useState("");
  const [newOptionC, setNewOptionC] = useState("");
  const [newOptionD, setNewOptionD] = useState("");
  const [newOptionE, setNewOptionE] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState<"A" | "B" | "C" | "D" | "E">("A");
  const [newExplanation, setNewExplanation] = useState("");
  const [newMarks, setNewMarks] = useState(1);
  const [newDifficulty, setNewDifficulty] = useState("Medium");
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Bulk Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (!session?.user) {
          router.replace("/login?redirect=/tutor/questions");
          return;
        }

        const admin = await getAdminSession();
        if (admin) {
          setCurrentUser(admin);
          setIsSuperAdmin(admin.role === "super_admin" || admin.role === "platform_admin");
        }

        // Fetch subjects
        const { data: subjectRows } = await supabase
          .from("learning_subjects")
          .select("name")
          .order("name", { ascending: true });

        if (active && subjectRows) {
          const names = Array.from(new Set(subjectRows.map((s) => s.name))).sort();
          setSubjectsList(names);
          if (names.length > 0 && !newSubject) {
            setNewSubject(names[0]);
          }
        }

        await loadQuestions(selectedSubject, searchQuery, statusFilter);
      } catch (err: any) {
        if (active) setNotification({ type: "error", text: "Could not load question repository." });
      } finally {
        if (active) setLoading(false);
      }
    }

    void init();
    return () => { active = false; };
  }, [router]);

  async function loadQuestions(subj = selectedSubject, query = searchQuery, stat = statusFilter) {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("questions")
        .select("id,source_question_id,subject,section,category,question,question_image_url,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,marks,difficulty,is_active", { count: "exact" });

      if (subj !== "All") {
        queryBuilder = queryBuilder.ilike("subject", subj);
      }
      if (stat === "active") {
        queryBuilder = queryBuilder.eq("is_active", true);
      } else if (stat === "inactive") {
        queryBuilder = queryBuilder.eq("is_active", false);
      }
      if (query.trim()) {
        queryBuilder = queryBuilder.ilike("question", `%${query.trim()}%`);
      }

      const { data, count, error } = await queryBuilder
        .order("id", { ascending: false })
        .limit(100);

      if (error) throw error;
      setQuestions((data as QuestionItem[]) || []);
      setTotalCount(count ?? data?.length ?? 0);
    } catch {
      setNotification({ type: "error", text: "Failed to query questions from database." });
    } finally {
      setLoading(false);
    }
  }

  // Handle single question creation
  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim() || !newQuestionText.trim() || !newOptionA.trim() || !newOptionB.trim()) {
      setNotification({ type: "error", text: "Please supply Subject, Question text, Option A and Option B." });
      return;
    }

    setSavingQuestion(true);
    setNotification(null);

    try {
      const payload = {
        subject: newSubject.trim(),
        section: newSection.trim() || "General",
        category: newCategory.trim() || null,
        question: newQuestionText.trim(),
        option_a: newOptionA.trim(),
        option_b: newOptionB.trim(),
        option_c: newOptionC.trim() || null,
        option_d: newOptionD.trim() || null,
        option_e: newOptionE.trim() || null,
        correct_answer: newCorrectAnswer,
        explanation: newExplanation.trim() || null,
        marks: Number(newMarks) || 1,
        difficulty: newDifficulty,
        is_active: true,
      };

      const { data, error } = await supabase.from("questions").insert([payload]).select().single();
      if (error) throw error;

      setNotification({ type: "success", text: `Question #${data.id} published successfully!` });
      setNewQuestionText("");
      setNewOptionA("");
      setNewOptionB("");
      setNewOptionC("");
      setNewOptionD("");
      setNewOptionE("");
      setNewExplanation("");
      setMode("browse");
      void loadQuestions();
    } catch (err: any) {
      setNotification({ type: "error", text: err?.message || "Failed to save question." });
    } finally {
      setSavingQuestion(false);
    }
  }

  // Toggle active state
  async function handleToggleStatus(item: QuestionItem) {
    try {
      const nextStatus = !item.is_active;
      const { error } = await supabase
        .from("questions")
        .update({ is_active: nextStatus })
        .eq("id", item.id);

      if (error) throw error;
      setQuestions((prev) => prev.map((q) => (q.id === item.id ? { ...q, is_active: nextStatus } : q)));
      setNotification({ type: "success", text: `Question #${item.id} is now ${nextStatus ? "Active" : "Archived"}.` });
    } catch {
      setNotification({ type: "error", text: "Failed to update question status." });
    }
  }

  // Delete question
  async function handleDeleteQuestion(id: number) {
    if (!window.confirm(`Are you sure you want to permanently delete question #${id}?`)) return;
    try {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
      setNotification({ type: "success", text: `Question #${id} removed from Question Bank.` });
    } catch {
      setNotification({ type: "error", text: "Failed to delete question." });
    }
  }

  // CSV parsing
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (res) => {
        setImportPreview(res.data);
      },
    });
  }

  async function handleExecuteImport() {
    if (!csvFile) return;
    setImporting(true);
    setNotification(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const parsedQuestions = rows.map((r) => ({
            subject: r.subject || r.Subject || newSubject || "General",
            section: r.section || r.Section || "General",
            category: r.category || r.Category || null,
            question: r.question || r.Question || "",
            option_a: r.option_a || r.OptionA || r.A || "",
            option_b: r.option_b || r.OptionB || r.B || "",
            option_c: r.option_c || r.OptionC || r.C || null,
            option_d: r.option_d || r.OptionD || r.D || null,
            option_e: r.option_e || r.OptionE || r.E || null,
            correct_answer: (r.correct_answer || r.CorrectAnswer || r.Answer || "A").trim().toUpperCase(),
            explanation: r.explanation || r.Explanation || null,
            marks: Number(r.marks || r.Marks || 1),
            difficulty: r.difficulty || r.Difficulty || "Medium",
            is_active: true,
          })).filter((q) => q.question && q.option_a && q.option_b);

          if (parsedQuestions.length === 0) {
            setNotification({ type: "error", text: "No valid question records found in CSV file." });
            setImporting(false);
            return;
          }

          // Batch insert in chunks of 50
          const chunkSize = 50;
          let insertedCount = 0;
          for (let i = 0; i < parsedQuestions.length; i += chunkSize) {
            const chunk = parsedQuestions.slice(i, i + chunkSize);
            const { error } = await supabase.from("questions").insert(chunk);
            if (error) throw error;
            insertedCount += chunk.length;
          }

          setNotification({ type: "success", text: `Successfully imported ${insertedCount} questions into Question Bank!` });
          setCsvFile(null);
          setImportPreview([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setMode("browse");
          void loadQuestions();
        } catch (err: any) {
          setNotification({ type: "error", text: `Import failed: ${err?.message || "Unknown error"}` });
        } finally {
          setImporting(false);
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-indigo-200/60 pb-6 dark:border-indigo-950/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-black uppercase text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
              Academic Content Hub
            </span>
            {isSuperAdmin && (
              <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-black uppercase text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                👑 Super Admin Access
              </span>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Question Bank &amp; CBT Authoring
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Create, calibrate, and batch-upload syllabus-aligned questions for student mock exams, self-practice, and tests.
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("browse")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mode === "browse"
                ? "bg-indigo-600 text-white shadow-md dark:bg-indigo-500"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            }`}
          >
            📋 Browse Questions ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mode === "create"
                ? "bg-indigo-600 text-white shadow-md dark:bg-indigo-500"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            }`}
          >
            ➕ Add Question
          </button>
          <button
            type="button"
            onClick={() => setMode("import")}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              mode === "import"
                ? "bg-indigo-600 text-white shadow-md dark:bg-indigo-500"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            }`}
          >
            📥 Bulk CSV Ingest
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-bold ${
            notification.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : notification.type === "error"
              ? "bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300"
              : "bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300"
          }`}
        >
          <span>{notification.text}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-sm font-bold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode 1: Browse Questions */}
      {mode === "browse" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="grid gap-3 sm:grid-cols-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Filter by Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  void loadQuestions(e.target.value, searchQuery, statusFilter);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="All">All Subjects</option>
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Publication Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  const stat = e.target.value as any;
                  setStatusFilter(stat);
                  void loadQuestions(selectedSubject, searchQuery, stat);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="all">All Records</option>
                <option value="active">Active Only</option>
                <option value="inactive">Archived Only</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Search Questions
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search question text or keyword…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      void loadQuestions(selectedSubject, searchQuery, statusFilter);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => void loadQuestions(selectedSubject, searchQuery, statusFilter)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Question List */}
          {loading ? (
            <div className="p-12 text-center text-sm font-bold text-slate-500 animate-pulse">
              Loading questions from Question Bank…
            </div>
          ) : questions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
              <span className="text-3xl">📭</span>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">No questions found</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Try selecting a different subject, adjusting your search query, or add a new question.
              </p>
              <button
                type="button"
                onClick={() => setMode("create")}
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
              >
                Add First Question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-indigo-700 dark:text-indigo-400">#{q.id}</span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {q.subject}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {q.difficulty || "Standard"}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {q.marks} Mark{q.marks > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(q)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                          q.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {q.is_active ? "● Active" : "○ Archived"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteQuestion(q.id)}
                        className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                    {q.question}
                  </p>

                  {/* Options Grid */}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 text-xs">
                    {q.option_a && (
                      <div
                        className={`rounded-xl border p-2.5 ${
                          q.correct_answer === "A"
                            ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-900 dark:text-emerald-200"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        }`}
                      >
                        <strong>A:</strong> {q.option_a}
                      </div>
                    )}
                    {q.option_b && (
                      <div
                        className={`rounded-xl border p-2.5 ${
                          q.correct_answer === "B"
                            ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-900 dark:text-emerald-200"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        }`}
                      >
                        <strong>B:</strong> {q.option_b}
                      </div>
                    )}
                    {q.option_c && (
                      <div
                        className={`rounded-xl border p-2.5 ${
                          q.correct_answer === "C"
                            ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-900 dark:text-emerald-200"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        }`}
                      >
                        <strong>C:</strong> {q.option_c}
                      </div>
                    )}
                    {q.option_d && (
                      <div
                        className={`rounded-xl border p-2.5 ${
                          q.correct_answer === "D"
                            ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-900 dark:text-emerald-200"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        }`}
                      >
                        <strong>D:</strong> {q.option_d}
                      </div>
                    )}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 rounded-xl bg-indigo-50/50 p-2.5 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300">
                      <strong>💡 Solution / Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Add Single Question Form */}
      {mode === "create" && (
        <form
          onSubmit={handleCreateQuestion}
          className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
        >
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Exam Question</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formulate individual multiple-choice questions aligned with Nigerian curricula (JAMB / WAEC / NECO).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                list="subjects-datalist"
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Mathematics, Chemistry"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
              <datalist id="subjects-datalist">
                {subjectsList.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Section</label>
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="e.g. Section 1, Algebra"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Difficulty</label>
              <select
                value={newDifficulty}
                onChange={(e) => setNewDifficulty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="Easy">Easy (Foundational)</option>
                <option value="Medium">Medium (Standard)</option>
                <option value="Hard">Hard (Advanced / Olympiad)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Question Text / Scenario <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              required
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              placeholder="Enter the full question prompt, equation, or scenario…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 leading-relaxed"
            />
          </div>

          {/* Options A-D */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Option A <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newOptionA}
                onChange={(e) => setNewOptionA(e.target.value)}
                placeholder="Choice A text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Option B <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newOptionB}
                onChange={(e) => setNewOptionB(e.target.value)}
                placeholder="Choice B text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Option C</label>
              <input
                type="text"
                value={newOptionC}
                onChange={(e) => setNewOptionC(e.target.value)}
                placeholder="Choice C text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Option D</label>
              <input
                type="text"
                value={newOptionD}
                onChange={(e) => setNewOptionD(e.target.value)}
                placeholder="Choice D text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Correct Answer Key <span className="text-rose-500">*</span>
              </label>
              <select
                value={newCorrectAnswer}
                onChange={(e) => setNewCorrectAnswer(e.target.value as any)}
                className="w-full rounded-xl border border-emerald-500/40 bg-emerald-50/30 px-3.5 py-2.5 text-xs font-black text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
                <option value="E">Option E</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Marks</label>
              <input
                type="number"
                min="1"
                max="10"
                value={newMarks}
                onChange={(e) => setNewMarks(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Solution / Step-by-Step Explanation
            </label>
            <textarea
              rows={3}
              value={newExplanation}
              onChange={(e) => setNewExplanation(e.target.value)}
              placeholder="Why is this answer correct? Provide the step-by-step working so candidates learn upon exam correction…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMode("browse")}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingQuestion}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {savingQuestion ? "Saving Question…" : "Publish Question to Bank"}
            </button>
          </div>
        </form>
      )}

      {/* Mode 3: Bulk CSV Import */}
      {mode === "import" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Batch CSV Question Ingestion</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload spreadsheets containing hundreds of questions. Columns supported:{" "}
              <code>subject, question, option_a, option_b, option_c, option_d, correct_answer, explanation</code>.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-indigo-200 p-8 text-center dark:border-indigo-950/70">
            <span className="text-4xl">📄</span>
            <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Select or drop CSV file here</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Standard UTF-8 comma-separated files</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelected}
              className="mt-4 inline-block text-xs text-slate-600 dark:text-slate-400"
            />
          </div>

          {importPreview.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Previewing First 5 Records from {csvFile?.name}:
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="p-3">Subject</th>
                      <th className="p-3">Question</th>
                      <th className="p-3">A</th>
                      <th className="p-3">B</th>
                      <th className="p-3">Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {importPreview.map((r, idx) => (
                      <tr key={idx} className="dark:text-slate-200">
                        <td className="p-3">{r.subject || r.Subject || "—"}</td>
                        <td className="p-3 truncate max-w-xs">{r.question || r.Question || "—"}</td>
                        <td className="p-3 truncate max-w-[120px]">{r.option_a || r.A || "—"}</td>
                        <td className="p-3 truncate max-w-[120px]">{r.option_b || r.B || "—"}</td>
                        <td className="p-3 font-bold text-emerald-600">{r.correct_answer || r.Answer || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCsvFile(null);
                    setImportPreview([]);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:text-slate-300"
                >
                  Discard
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleExecuteImport}
                  className="rounded-xl bg-indigo-600 px-6 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {importing ? "Ingesting Rows…" : "Execute Batch Ingestion"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
