"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { getAdminSession, adminSignOut, type AdminUser } from "../../lib/adminAuth";
import { adminHasPermission, type AdminPermission } from "../../lib/adminRoles";
import AdminWorkspaceShell from "../AdminWorkspaceShell";

export interface CustomQuestion {
  id: string;
  prompt: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E?: string;
  };
  correct_answer: "A" | "B" | "C" | "D" | "E";
  explanation?: string;
  image_url?: string;
  marks?: number;
}

export interface AssessmentItem {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  assessment_type: string;
  question_source: "legacy_questions" | "bank" | "custom_builder" | "csv_import";
  subjects: string[];
  categories: string[];
  question_count: number;
  duration_seconds: number | null;
  max_attempts: number;
  pass_percentage: number;
  shuffle_questions: boolean;
  starts_at: string | null;
  ends_at: string | null;
  access_code_required: boolean;
  result_release: string;
  is_published: boolean;
  status: "draft" | "open" | "closed";
  custom_questions?: CustomQuestion[];
  customQuestionsCount?: number;
  attemptsCount?: number;
  completedAttemptsCount?: number;
  avgScore?: number;
  created_at: string;
}

export default function AcademyAssessmentsAdminPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<AdminPermission, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Data states
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [subjectStats, setSubjectStats] = useState<Record<string, { total: number; categories: Record<string, number> }>>({});

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "draft" | "closed">("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  // Notifications
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<"scope" | "timing" | "questions">("scope");
  const [saving, setSaving] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formScopeType, setFormScopeType] = useState<"single_topic" | "single_subject" | "multi_subject">("single_subject");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [formQuestionSource, setFormQuestionSource] = useState<"bank" | "custom_builder" | "csv_import">("bank");
  const [formQuestionCount, setFormQuestionCount] = useState(20);
  const [formDurationMinutes, setFormDurationMinutes] = useState<number | null>(30);
  const [formPassPercentage, setFormPassPercentage] = useState(70);
  const [formMaxAttempts, setFormMaxAttempts] = useState(1);
  const [formShuffleQuestions, setFormShuffleQuestions] = useState(true);
  const [formAccessCodeRequired, setFormAccessCodeRequired] = useState(false);
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formStatus, setFormStatus] = useState<"draft" | "open" | "closed">("open");

  // Custom Questions Builder & CSV Import State
  const [builderQuestions, setBuilderQuestions] = useState<CustomQuestion[]>([]);
  const [newPrompt, setNewPrompt] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newOptionA, setNewOptionA] = useState("");
  const [newOptionB, setNewOptionB] = useState("");
  const [newOptionC, setNewOptionC] = useState("");
  const [newOptionD, setNewOptionD] = useState("");
  const [newOptionE, setNewOptionE] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState<"A" | "B" | "C" | "D" | "E">("A");
  const [newExplanation, setNewExplanation] = useState("");
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");

  // Authenticated fetch helper attaching Bearer token
  const authFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(init?.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return fetch(input, { ...init, headers });
  }, []);

  // Load assessments & metadata from server API
  const loadAssessments = useCallback(async () => {
    setError("");
    try {
      const res = await authFetch("/api/admin/assessments");
      const data = await res.json();
      if (res.ok && data.ok) {
        setAssessments(data.assessments || []);
        setAvailableSubjects(data.subjects || []);
        setSubjectStats(data.subjectStats || {});
      } else {
        setError(data.error || "Could not load assessments from server.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to assessment services.");
    }
  }, [authFetch]);

  useEffect(() => {
    let active = true;
    async function init() {
      const session = await getAdminSession();
      if (!active) return;
      if (!session) {
        router.replace("/account");
        return;
      }
      setAdmin(session);

      const perms: Partial<Record<AdminPermission, boolean>> = {};
      perms["learning.content.manage"] = await adminHasPermission("learning.content.manage");
      perms["cbt.questions.manage"] = await adminHasPermission("cbt.questions.manage");
      perms["cbt.results.read"] = await adminHasPermission("cbt.results.read");
      setPermissions(perms);

      await loadAssessments();
      if (active) setLoading(false);
    }

    void init().catch(() => {
      if (active) {
        setError("Could not verify administrator credentials.");
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [router, loadAssessments]);

  // Available topics computed from selected subjects
  const availableTopicsForSelectedSubjects = useMemo(() => {
    const topicSet = new Set<string>();
    selectedSubjects.forEach((s) => {
      const stats = subjectStats[s];
      if (stats?.categories) {
        Object.keys(stats.categories).forEach((c) => topicSet.add(c));
      }
    });
    return Array.from(topicSet).sort();
  }, [selectedSubjects, subjectStats]);

  // Available question pool in main bank based on current scope
  const availableQuestionBankCount = useMemo(() => {
    if (selectedSubjects.length === 0) return 0;
    let count = 0;
    selectedSubjects.forEach((s) => {
      const stats = subjectStats[s];
      if (!stats) return;
      if (selectedTopics.length === 0) {
        count += stats.total;
      } else {
        selectedTopics.forEach((t) => {
          count += stats.categories[t] || 0;
        });
      }
    });
    return count;
  }, [selectedSubjects, selectedTopics, subjectStats]);

  // Reset form
  const resetForm = () => {
    setEditingAssessmentId(null);
    setFormTitle("");
    setFormDescription("");
    setFormInstructions("");
    setFormScopeType("single_subject");
    setSelectedSubjects(availableSubjects.length > 0 ? [availableSubjects[0]] : ["Mathematics"]);
    setSelectedTopics([]);
    setFormQuestionSource("bank");
    setFormQuestionCount(20);
    setFormDurationMinutes(30);
    setFormPassPercentage(70);
    setFormMaxAttempts(1);
    setFormShuffleQuestions(true);
    setFormAccessCodeRequired(false);
    setFormStartsAt("");
    setFormEndsAt("");
    setFormStatus("open");
    setBuilderQuestions([]);
    setModalTab("scope");
    setCsvError("");
    setCsvSuccess("");
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item: AssessmentItem) => {
    setEditingAssessmentId(item.id);
    setFormTitle(item.title);
    setFormDescription(item.description || "");
    setFormInstructions(item.instructions || "");
    setSelectedSubjects(item.subjects || []);
    setSelectedTopics(item.categories || []);
    setFormScopeType(
      item.subjects.length > 1
        ? "multi_subject"
        : item.categories.length > 0
        ? "single_topic"
        : "single_subject"
    );
    setFormQuestionSource(
      item.question_source === "legacy_questions" ? "bank" : (item.question_source as any) || "bank"
    );
    setFormQuestionCount(item.question_count);
    setFormDurationMinutes(item.duration_seconds ? Math.round(item.duration_seconds / 60) : null);
    setFormPassPercentage(item.pass_percentage ?? 70);
    setFormMaxAttempts(item.max_attempts ?? 1);
    setFormShuffleQuestions(item.shuffle_questions !== false);
    setFormAccessCodeRequired(Boolean(item.access_code_required));
    setFormStartsAt(item.starts_at ? new Date(item.starts_at).toISOString().slice(0, 16) : "");
    setFormEndsAt(item.ends_at ? new Date(item.ends_at).toISOString().slice(0, 16) : "");
    setFormStatus(item.status || (item.is_published ? "open" : "draft"));
    setBuilderQuestions(Array.isArray(item.custom_questions) ? item.custom_questions : []);
    setModalTab("scope");
    setIsModalOpen(true);
  };

  // Quick Status Toggle (Open <-> Closed, or Draft <-> Open)
  const handleToggleStatus = async (item: AssessmentItem, targetStatus: "open" | "closed" | "draft") => {
    try {
      const res = await authFetch(`/api/admin/assessments/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage(`Assessment "${item.title}" is now ${targetStatus.toUpperCase()}!`);
        await loadAssessments();
      } else {
        setError(data.error || "Failed to update assessment status.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error updating status.");
    }
  };

  // Delete Assessment
  const handleDeleteAssessment = async (item: AssessmentItem) => {
    if (!window.confirm(`Permanently delete assessment "${item.title}" and its configured question setup?`)) {
      return;
    }
    try {
      const res = await authFetch(`/api/admin/assessments/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage(`Assessment "${item.title}" deleted successfully.`);
        await loadAssessments();
      } else {
        setError(data.error || "Failed to delete assessment.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error deleting assessment.");
    }
  };

  // Add Question via Interactive Builder
  const handleAddBuilderQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim() || !newOptionA.trim() || !newOptionB.trim() || !newOptionC.trim() || !newOptionD.trim()) {
      setError("Please fill in question prompt and Options A through D.");
      return;
    }

    const question: CustomQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      prompt: newPrompt.trim(),
      options: {
        A: newOptionA.trim(),
        B: newOptionB.trim(),
        C: newOptionC.trim(),
        D: newOptionD.trim(),
        ...(newOptionE.trim() ? { E: newOptionE.trim() } : {}),
      },
      correct_answer: newCorrectAnswer,
      explanation: newExplanation.trim() || undefined,
      image_url: newImageUrl.trim() || undefined,
      marks: 1,
    };

    setBuilderQuestions((prev) => [...prev, question]);
    setNewPrompt("");
    setNewImageUrl("");
    setNewOptionA("");
    setNewOptionB("");
    setNewOptionC("");
    setNewOptionD("");
    setNewOptionE("");
    setNewExplanation("");
    setNewCorrectAnswer("A");
    setMessage("Question added to assessment question pool!");
  };

  const handleRemoveBuilderQuestion = (qId: string) => {
    setBuilderQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  // CSV Import Parser
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    setCsvSuccess("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = String(evt.target?.result || "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setCsvError("CSV file must contain a header row and at least 1 question row.");
          return;
        }

        const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
        const qIndex = header.findIndex((h) => h.includes("question") || h.includes("prompt"));
        const aIndex = header.findIndex((h) => h === "option_a" || h === "option a" || h === "a");
        const bIndex = header.findIndex((h) => h === "option_b" || h === "option b" || h === "b");
        const cIndex = header.findIndex((h) => h === "option_c" || h === "option c" || h === "c");
        const dIndex = header.findIndex((h) => h === "option_d" || h === "option d" || h === "d");
        const eIndex = header.findIndex((h) => h === "option_e" || h === "option e" || h === "e");
        const ansIndex = header.findIndex((h) => h.includes("correct") || h.includes("answer") || h === "key");
        const expIndex = header.findIndex((h) => h.includes("explanation") || h.includes("solution"));
        const imgIndex = header.findIndex((h) => h.includes("image") || h.includes("url"));

        if (qIndex === -1 || aIndex === -1 || bIndex === -1 || cIndex === -1 || dIndex === -1 || ansIndex === -1) {
          setCsvError("CSV header must contain columns: Question, Option A, Option B, Option C, Option D, Correct Answer.");
          return;
        }

        const parsedList: CustomQuestion[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",").map((col) => col.trim().replace(/^["']|["']$/g, ""));
          const prompt = row[qIndex];
          const optA = row[aIndex];
          const optB = row[bIndex];
          const optC = row[cIndex];
          const optD = row[dIndex];
          const rawAns = (row[ansIndex] || "A").toUpperCase().trim();
          const validAns = ["A", "B", "C", "D", "E"].includes(rawAns) ? (rawAns as any) : "A";

          if (prompt && optA && optB) {
            parsedList.push({
              id: `csv_${Date.now()}_${i}`,
              prompt,
              options: {
                A: optA,
                B: optB,
                C: optC || "N/A",
                D: optD || "N/A",
                ...(eIndex !== -1 && row[eIndex] ? { E: row[eIndex] } : {}),
              },
              correct_answer: validAns,
              explanation: expIndex !== -1 ? row[expIndex] : undefined,
              image_url: imgIndex !== -1 ? row[imgIndex] : undefined,
              marks: 1,
            });
          }
        }

        if (parsedList.length === 0) {
          setCsvError("No valid question rows could be extracted from this CSV.");
          return;
        }

        setBuilderQuestions((prev) => [...prev, ...parsedList]);
        setFormQuestionCount((prev) => Math.max(prev, parsedList.length));
        setCsvSuccess(`Successfully imported ${parsedList.length} questions from CSV!`);
      } catch (err) {
        setCsvError("Failed to parse CSV file: " + (err instanceof Error ? err.message : "Invalid format"));
      }
    };
    reader.readAsText(file);
  };

  // Download sample CSV template
  const downloadSampleCsv = () => {
    const csvContent =
      "Question,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Image URL\n" +
      '"What is the solution to 2x + 6 = 14?","x = 2","x = 4","x = 6","x = 8","","B","Subtract 6 to get 2x = 8, then divide by 2 to get x = 4.",""\n' +
      '"Which element has atomic number 6?","Oxygen","Nitrogen","Carbon","Helium","","C","Carbon has atomic number 6 and 4 valence electrons.",""';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "BrainLab_Assessment_Questions_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  // Save / Update Assessment Submit Handler
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setError("Please provide an assessment title.");
      return;
    }
    if (selectedSubjects.length === 0 && formQuestionSource === "bank") {
      setError("Please select at least one subject.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        instructions: formInstructions.trim() || null,
        scope_type: formScopeType,
        subjects: selectedSubjects,
        categories: selectedTopics,
        question_source: formQuestionSource,
        question_count: formQuestionSource === "bank" ? formQuestionCount : builderQuestions.length || formQuestionCount,
        duration_minutes: formDurationMinutes,
        pass_percentage: formPassPercentage,
        max_attempts: formMaxAttempts,
        shuffle_questions: formShuffleQuestions,
        access_code_required: formAccessCodeRequired,
        starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
        ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
        status: formStatus,
        custom_questions: builderQuestions,
      };

      const url = editingAssessmentId ? `/api/admin/assessments/${editingAssessmentId}` : "/api/admin/assessments";
      const method = editingAssessmentId ? "PATCH" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage(data.message || "Assessment saved successfully!");
        setIsModalOpen(false);
        resetForm();
        await loadAssessments();
      } else {
        setError(data.error || "Failed to save assessment configuration.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error saving assessment.");
    } finally {
      setSaving(false);
    }
  };

  // Copy candidate test link to clipboard
  const handleCopyLink = (assessmentId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://www.brainlabacademy.com.ng";
    const link = `${origin}/assessments/${assessmentId}`;
    navigator.clipboard.writeText(link);
    setMessage(`Candidate assessment link copied to clipboard! (${link})`);
  };

  // Filtered assessment list
  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      const matchesSearch =
        search.trim() === "" ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "open" && item.status === "open") ||
        (statusFilter === "draft" && item.status === "draft") ||
        (statusFilter === "closed" && item.status === "closed");

      const matchesSubject =
        subjectFilter === "all" || item.subjects.includes(subjectFilter);

      return matchesSearch && matchesStatus && matchesSubject;
    });
  }, [assessments, search, statusFilter, subjectFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = assessments.length;
    const openCount = assessments.filter((a) => a.status === "open").length;
    const draftCount = assessments.filter((a) => a.status === "draft").length;
    const closedCount = assessments.filter((a) => a.status === "closed").length;
    const totalAttempts = assessments.reduce((acc, curr) => acc + (curr.attemptsCount || 0), 0);
    return { total, openCount, draftCount, closedCount, totalAttempts };
  }, [assessments]);

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Loading Learning Assessment Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminWorkspaceShell
      user={admin}
      permissions={permissions}
      onLogout={async () => {
        await adminSignOut();
        router.replace("/account");
      }}
    >
      <div className="space-y-8 p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-600">
                BrainLab Academic Architecture
              </span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                Live Assessment Engine
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">Learning Assessment Hub</h1>
            <p className="text-xs text-slate-500 mt-1">
              Create, configure, and monitor multi-topic drills, single-subject tests, and scheduled mock assessments with flexible question sources and randomization.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startTransition(() => void loadAssessments())}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            >
              <svg className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#012153] hover:bg-blue-900 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
            >
              <span>+ Create Assessment</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-bold text-rose-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">✕</button>
          </div>
        )}

        {message && (
          <div role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🎉</span>
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage("")} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">Total Assessments</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{metrics.total}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-slate-400">All configurations</span>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
            <p className="text-xs font-semibold text-emerald-800">Open &amp; Active</p>
            <p className="mt-2 text-2xl font-black text-emerald-900">{metrics.openCount}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-emerald-700">Live for candidates</span>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
            <p className="text-xs font-semibold text-amber-800">Draft Status</p>
            <p className="mt-2 text-2xl font-black text-amber-900">{metrics.draftCount}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-amber-700">Unpublished</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-xs">
            <p className="text-xs font-semibold text-slate-700">Closed / Concluded</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{metrics.closedCount}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-slate-500">Ended testing</span>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs">
            <p className="text-xs font-semibold text-blue-800">Candidate Attempts</p>
            <p className="mt-2 text-2xl font-black text-blue-900">{metrics.totalAttempts.toLocaleString()}</p>
            <span className="mt-1 inline-block text-[10px] font-medium text-blue-700">Tested submissions</span>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search assessment title, subjects, or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(["all", "open", "draft", "closed"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition ${
                    statusFilter === tab
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab === "all" ? "All" : tab}
                </button>
              ))}
            </div>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Assessments List Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Assessment Title</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Scope &amp; Subjects</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Source</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Questions &amp; Time</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Schedule / Window</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssessments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No learning assessments matched your search or filters. Click &ldquo;+ Create Assessment&rdquo; to launch one.
                    </td>
                  </tr>
                ) : (
                  filteredAssessments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                            {item.access_code_required && (
                              <span className="rounded-md bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5" title="Access code required">
                                PIN PROTECTED
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400">
                              Pass: {item.pass_percentage ?? 70}% &bull; {item.max_attempts} Attempt(s)
                            </span>
                            {item.shuffle_questions !== false ? (
                              <span className="text-[10px] text-emerald-700 font-medium">🔀 Shuffled</span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-medium">➡️ Sequential</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.subjects.map((s) => (
                            <span key={s} className="rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                        {item.categories && item.categories.length > 0 && (
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                            Topics: {item.categories.join(", ")}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.question_source === "bank" || item.question_source === "legacy_questions" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold text-indigo-700">
                            🏛️ Main Bank
                          </span>
                        ) : item.question_source === "csv_import" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                            📄 CSV Import ({item.customQuestionsCount || 0})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-extrabold text-purple-700">
                            ✍️ Custom Builder ({item.customQuestionsCount || 0})
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">
                          {item.question_count} Questions
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} Minutes` : "Untimed"}
                        </p>
                        {item.attemptsCount !== undefined && item.attemptsCount > 0 && (
                          <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                            {item.attemptsCount} Attempts (Avg {item.avgScore}%)
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.starts_at || item.ends_at ? (
                          <div className="text-[11px] space-y-0.5">
                            {item.starts_at && (
                              <p className="text-slate-600">
                                Starts: {new Date(item.starts_at).toLocaleDateString()} {new Date(item.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {item.ends_at && (
                              <p className="text-slate-600">
                                Ends: {new Date(item.ends_at).toLocaleDateString()} {new Date(item.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Always Open</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {item.status === "open" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            OPEN / LIVE
                          </span>
                        ) : item.status === "closed" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
                            CLOSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                            DRAFT
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === "open" ? (
                            <button
                              onClick={() => handleToggleStatus(item, "closed")}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition"
                              title="Close / Lock Assessment"
                            >
                              Lock
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(item, "open")}
                              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition"
                              title="Open & Publish Assessment for Candidates"
                            >
                              Open
                            </button>
                          )}

                          <button
                            onClick={() => handleCopyLink(item.id)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50 transition"
                            title="Copy Candidate Test URL"
                          >
                            🔗 Link
                          </button>

                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:bg-slate-50 transition"
                            title="Edit Assessment & Manage Questions"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteAssessment(item)}
                            className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Assessment"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CREATE / EDIT ASSESSMENT MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="w-full max-w-4xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {editingAssessmentId ? "Edit Learning Assessment" : "Create Learning Assessment"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure subject combinations, question source, time controls, and scheduled availability.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex border-b border-slate-200 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setModalTab("scope")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                    modalTab === "scope" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  1. Scope &amp; Subjects
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("timing")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                    modalTab === "timing" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  2. Timing &amp; Configuration
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("questions")}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition ${
                    modalTab === "questions" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  3. Question Source ({formQuestionSource === "bank" ? "Main Bank" : builderQuestions.length + " Custom"})
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSaveAssessment} className="space-y-6 overflow-y-auto pr-1 flex-1">
                {/* TAB 1: SCOPE & SUBJECTS */}
                {modalTab === "scope" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                        Assessment Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Mathematics - Quadratic Equations Mastery Test"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Assessment Scope Mode
                        </label>
                        <select
                          value={formScopeType}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFormScopeType(val);
                            if (val === "multi_subject" && selectedSubjects.length <= 1) {
                              setSelectedSubjects(availableSubjects.slice(0, 4));
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="single_topic">🎯 Single Subject &amp; Specific Topic</option>
                          <option value="single_subject">📚 Single Subject (All or Selected Topics)</option>
                          <option value="multi_subject">🌐 Multi-Subject Assessment / Mock Combination</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Assessment Status
                        </label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="open">🟢 Open &amp; Active (Ready for candidates)</option>
                          <option value="draft">🟡 Draft (Hold for review, not visible to students)</option>
                          <option value="closed">🔴 Closed (Concluded &amp; locked)</option>
                        </select>
                      </div>
                    </div>

                    {/* Subject Selector */}
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                        Select Subject(s) *
                      </label>
                      <div className="flex flex-wrap gap-2 p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        {availableSubjects.map((subject) => {
                          const isSelected = selectedSubjects.includes(subject);
                          return (
                            <button
                              key={subject}
                              type="button"
                              onClick={() => {
                                if (formScopeType === "multi_subject") {
                                  setSelectedSubjects((prev) =>
                                    prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
                                  );
                                } else {
                                  setSelectedSubjects([subject]);
                                  setSelectedTopics([]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span>{isSelected ? "✓" : "+"}</span>
                              <span>{subject}</span>
                              <span className="text-[10px] opacity-75">
                                ({subjectStats[subject]?.total || 0} qs)
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Topic / Category Filter (if Single Subject or Single Topic) */}
                    {formScopeType !== "multi_subject" && availableTopicsForSelectedSubjects.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                            Filter Topics / Categories (Optional)
                          </label>
                          {selectedTopics.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedTopics([])}
                              className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                              Clear selection (Use all topics)
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl border border-slate-200 bg-slate-50 max-h-36 overflow-y-auto">
                          {availableTopicsForSelectedSubjects.map((topic) => {
                            const isSelected = selectedTopics.includes(topic);
                            const qCount = selectedSubjects.reduce(
                              (acc, s) => acc + (subjectStats[s]?.categories?.[topic] || 0),
                              0
                            );
                            return (
                              <button
                                key={topic}
                                type="button"
                                onClick={() => {
                                  if (formScopeType === "single_topic") {
                                    setSelectedTopics([topic]);
                                  } else {
                                    setSelectedTopics((prev) =>
                                      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
                                    );
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  isSelected
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {topic} ({qCount})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Brief description & candidate instructions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Description (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder="Brief candidate summary displayed on assessment cards..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Instructions for Test Takers (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={formInstructions}
                          onChange={(e) => setFormInstructions(e.target.value)}
                          placeholder="Special guidelines, calculator usage notes, formula reminders..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TIMING & CONFIGURATION */}
                {modalTab === "timing" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Number of Questions *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          required
                          value={formQuestionCount}
                          onChange={(e) => setFormQuestionCount(Number(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                        />
                        {formQuestionSource === "bank" && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Available in bank: <strong className="text-slate-700">{availableQuestionBankCount} questions</strong>
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Duration (Minutes)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            max={600}
                            disabled={formDurationMinutes === null}
                            value={formDurationMinutes ?? ""}
                            onChange={(e) => setFormDurationMinutes(Number(e.target.value) || null)}
                            placeholder="Untimed"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => setFormDurationMinutes((prev) => (prev === null ? 30 : null))}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition ${
                              formDurationMinutes === null
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-700 border-slate-300"
                            }`}
                          >
                            Untimed
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Pass Percentage (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={formPassPercentage}
                          onChange={(e) => setFormPassPercentage(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Window & Scheduling */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Open Start Date &amp; Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={formStartsAt}
                          onChange={(e) => setFormStartsAt(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Leave empty to open immediately once published.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Closing End Date &amp; Time (Optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={formEndsAt}
                          onChange={(e) => setFormEndsAt(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Leave empty for an ongoing/evergreen assessment.</p>
                      </div>
                    </div>

                    {/* Switches & Randomization Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        <input
                          id="shuffleQuestions"
                          type="checkbox"
                          checked={formShuffleQuestions}
                          onChange={(e) => setFormShuffleQuestions(e.target.checked)}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <label htmlFor="shuffleQuestions" className="cursor-pointer">
                          <p className="text-xs font-bold text-slate-800">Randomize / Shuffle Questions</p>
                          <p className="text-[10px] text-slate-500">Each candidate receives a randomized question sequence.</p>
                        </label>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50">
                        <input
                          id="accessCodeRequired"
                          type="checkbox"
                          checked={formAccessCodeRequired}
                          onChange={(e) => setFormAccessCodeRequired(e.target.checked)}
                          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <label htmlFor="accessCodeRequired" className="cursor-pointer">
                          <p className="text-xs font-bold text-slate-800">Access PIN / Code Required</p>
                          <p className="text-[10px] text-slate-500">Candidates must enter a verified PIN voucher to begin.</p>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Max Allowed Attempts
                        </label>
                        <select
                          value={formMaxAttempts}
                          onChange={(e) => setFormMaxAttempts(Number(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value={1}>1 Attempt Only (Strict Exam Mode)</option>
                          <option value={2}>2 Attempts Allowed</option>
                          <option value={3}>3 Attempts Allowed</option>
                          <option value={5}>5 Attempts Allowed</option>
                          <option value={100}>Unlimited Practice</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                          Result &amp; Solutions Release
                        </label>
                        <select
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                          defaultValue="after_submit"
                        >
                          <option value="after_submit">Immediate Score &amp; Corrections upon submission</option>
                          <option value="after_close">Release Solutions only after Assessment closes</option>
                          <option value="admin_only">Withheld / Admin Proctor Review only</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: QUESTION SOURCE */}
                {modalTab === "questions" && (
                  <div className="space-y-6">
                    {/* Source selector buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormQuestionSource("bank")}
                        className={`p-4 rounded-2xl border text-left transition ${
                          formQuestionSource === "bank"
                            ? "border-blue-600 bg-blue-50/60 shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-2xl">🏛️</span>
                        <h4 className="text-xs font-black text-slate-900 mt-2">Main Question Bank</h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Draw dynamically from 50,000+ active questions matching your selected subject and topic filters.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormQuestionSource("csv_import")}
                        className={`p-4 rounded-2xl border text-left transition ${
                          formQuestionSource === "csv_import"
                            ? "border-blue-600 bg-blue-50/60 shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-2xl">📄</span>
                        <h4 className="text-xs font-black text-slate-900 mt-2">Bulk CSV Import</h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Upload spreadsheet file with questions, options A-E, answer key, and explanation notes.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormQuestionSource("custom_builder")}
                        className={`p-4 rounded-2xl border text-left transition ${
                          formQuestionSource === "custom_builder"
                            ? "border-blue-600 bg-blue-50/60 shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-2xl">✍️</span>
                        <h4 className="text-xs font-black text-slate-900 mt-2">Interactive Question Builder</h4>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Craft tailored questions directly in the browser with rich formulas, options, images, and keys.
                        </p>
                      </button>
                    </div>

                    {/* SOURCE 1: MAIN QUESTION BANK PREVIEW */}
                    {formQuestionSource === "bank" && (
                      <div className="p-5 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                            Question Bank Allocation Summary
                          </h4>
                          <span className="rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-black px-2.5 py-0.5">
                            {availableQuestionBankCount} Active Questions Available
                          </span>
                        </div>
                        <p className="text-xs text-indigo-800">
                          This assessment will draw <strong>{formQuestionCount} questions</strong> at test runtime from:
                        </p>
                        <ul className="list-disc pl-5 text-xs text-indigo-900 space-y-1">
                          <li><strong>Subjects:</strong> {selectedSubjects.join(", ") || "None selected"}</li>
                          <li>
                            <strong>Topics:</strong>{" "}
                            {selectedTopics.length > 0 ? selectedTopics.join(", ") : "All Topics included"}
                          </li>
                          <li>
                            <strong>Randomization:</strong>{" "}
                            {formShuffleQuestions ? "Shuffled per candidate" : "Sequential fixed order"}
                          </li>
                        </ul>
                      </div>
                    )}

                    {/* SOURCE 2: CSV IMPORT INTERFACE */}
                    {formQuestionSource === "csv_import" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-2xl border border-slate-200 bg-slate-50">
                          <div>
                            <h4 className="text-xs font-black text-slate-900">Upload Questions CSV Spreadsheet</h4>
                            <p className="text-[11px] text-slate-500">
                              Accepts .csv format with headers: Question, Option A, Option B, Option C, Option D, Correct Answer, Explanation
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={downloadSampleCsv}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-white border border-slate-300 rounded-xl px-3 py-1.5 hover:bg-slate-100 transition shadow-2xs"
                          >
                            ⬇️ Download Sample CSV
                          </button>
                        </div>

                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvFileUpload}
                          className="block w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                        />

                        {csvError && <p className="text-xs font-bold text-rose-600">❌ {csvError}</p>}
                        {csvSuccess && <p className="text-xs font-bold text-emerald-600">✅ {csvSuccess}</p>}
                      </div>
                    )}

                    {/* SOURCE 3: INTERACTIVE QUESTION BUILDER */}
                    {(formQuestionSource === "custom_builder" || formQuestionSource === "csv_import") && (
                      <div className="space-y-6 pt-4 border-t border-slate-200">
                        {/* Builder Add Form */}
                        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Add Question to Assessment Pool
                          </h4>

                          <div>
                            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Question Prompt *
                            </label>
                            <textarea
                              rows={3}
                              value={newPrompt}
                              onChange={(e) => setNewPrompt(e.target.value)}
                              placeholder="Type the question text here..."
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-500 bg-white"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                Option A *
                              </label>
                              <input
                                type="text"
                                value={newOptionA}
                                onChange={(e) => setNewOptionA(e.target.value)}
                                placeholder="Choice A"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                Option B *
                              </label>
                              <input
                                type="text"
                                value={newOptionB}
                                onChange={(e) => setNewOptionB(e.target.value)}
                                placeholder="Choice B"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                Option C *
                              </label>
                              <input
                                type="text"
                                value={newOptionC}
                                onChange={(e) => setNewOptionC(e.target.value)}
                                placeholder="Choice C"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                Option D *
                              </label>
                              <input
                                type="text"
                                value={newOptionD}
                                onChange={(e) => setNewOptionD(e.target.value)}
                                placeholder="Choice D"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                Correct Answer Key *
                              </label>
                              <select
                                value={newCorrectAnswer}
                                onChange={(e) => setNewCorrectAnswer(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                                <option value="E">Option E</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                Optional HTTPS Image URL
                              </label>
                              <input
                                type="url"
                                value={newImageUrl}
                                onChange={(e) => setNewImageUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Step-by-Step Solution / Explanation (Shown in Corrections)
                            </label>
                            <textarea
                              rows={2}
                              value={newExplanation}
                              onChange={(e) => setNewExplanation(e.target.value)}
                              placeholder="Step-by-step derivation or key rule explanation..."
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleAddBuilderQuestion}
                            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-white shadow-xs transition"
                          >
                            + Add Question to Pool
                          </button>
                        </div>

                        {/* Staged Question Items Table */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                              Configured Questions in this Assessment ({builderQuestions.length})
                            </h4>
                            {builderQuestions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setBuilderQuestions([])}
                                className="text-[10px] text-rose-600 font-bold hover:underline"
                              >
                                Clear All ({builderQuestions.length})
                              </button>
                            )}
                          </div>

                          {builderQuestions.length === 0 ? (
                            <p className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                              No questions added yet. Use the question builder above or import a CSV file.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {builderQuestions.map((q, idx) => (
                                <div
                                  key={q.id || idx}
                                  className="flex items-start justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-2xs gap-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                                      <span className="rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5">
                                        Answer: {q.correct_answer}
                                      </span>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-900 line-clamp-2">{q.prompt}</p>
                                    <div className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                                      <span>A: {q.options.A}</span>
                                      <span>&bull;</span>
                                      <span>B: {q.options.B}</span>
                                      <span>&bull;</span>
                                      <span>C: {q.options.C}</span>
                                      <span>&bull;</span>
                                      <span>D: {q.options.D}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBuilderQuestion(q.id)}
                                    className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1"
                                    title="Remove Question"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-shrink-0">
                  <div className="flex gap-2">
                    {modalTab !== "scope" && (
                      <button
                        type="button"
                        onClick={() => setModalTab(modalTab === "questions" ? "timing" : "scope")}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                      >
                        &larr; Back
                      </button>
                    )}
                    {modalTab !== "questions" && (
                      <button
                        type="button"
                        onClick={() => setModalTab(modalTab === "scope" ? "timing" : "questions")}
                        className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition"
                      >
                        Next: {modalTab === "scope" ? "Timing &amp; Rules" : "Question Source"} &rarr;
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : editingAssessmentId ? "Update Assessment" : "Save & Launch Assessment"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminWorkspaceShell>
  );
}
