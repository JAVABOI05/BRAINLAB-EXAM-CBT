"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { enqueueMissedQuestion } from "../lib/spacedRepetition";
import type { RevisionDrillPayload, RevisionDrillQuestion } from "../api/learning/revision/drill/route";

interface Props {
  userId: string | null;
  onAddTopicToPlan?: (topic: string, subject: string) => void;
  onDeckUpdated?: () => void;
}

interface WeakTopicDiagnostic {
  subject: string;
  topic: string;
  scorePercent?: number;
  reason: string;
}

const DEFAULT_RECOMMENDED_TOPICS: WeakTopicDiagnostic[] = [
  {
    subject: "Mathematics",
    topic: "Quadratic Equations & Nature of Roots",
    scorePercent: 42,
    reason: "High frequency in UTME (8-12%); frequent sign & discriminant errors.",
  },
  {
    subject: "Physics",
    topic: "Geometrical Optics & Refraction",
    scorePercent: 48,
    reason: "Critical angle & curved mirror sign conventions frequently tested.",
  },
  {
    subject: "Chemistry",
    topic: "Stoichiometry & Gas Laws",
    scorePercent: 50,
    reason: "Molar volume at s.t.p. and redox mole ratios require high precision.",
  },
  {
    subject: "Biology",
    topic: "Genetics & Inheritance Patterns",
    scorePercent: 54,
    reason: "Sex-linked inheritance and ABO blood group crosses.",
  },
];

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Economics",
  "Government",
];

const EXAM_TYPE_OPTIONS = ["JAMB UTME", "WAEC WASSCE", "Post-UTME"];

export default function AiRevisionDrillArena({ userId, onAddTopicToPlan, onDeckUpdated }: Props) {
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [examType, setExamType] = useState("JAMB UTME");
  const [diagnostics, setDiagnostics] = useState<WeakTopicDiagnostic[]>(DEFAULT_RECOMMENDED_TOPICS);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Drill state
  const [drill, setDrill] = useState<RevisionDrillPayload | null>(null);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillError, setDrillError] = useState("");
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [addedToDeck, setAddedToDeck] = useState<Record<string, boolean>>({});
  const [addedToPlan, setAddedToPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<"drill" | "cheatSheet">("drill");

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min drill
  const [timerActive, setTimerActive] = useState(false);

  // Check past attempts to dynamically suggest diagnosed weak topics
  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function fetchWeakness() {
      setLoadingDiagnostics(true);
      try {
        const { data: attempts, error } = await supabase
          .from("learning_test_attempts")
          .select("score, total_marks, test_id, submitted_at")
          .eq("student_id", userId)
          .order("submitted_at", { ascending: false })
          .limit(10);

        if (!active) return;
        if (!error && attempts && attempts.length > 0) {
          const weakAttempts = attempts
            .filter((a) => a.total_marks > 0 && (a.score / a.total_marks) * 100 < 65)
            .slice(0, 3);

          if (weakAttempts.length > 0) {
            const detected: WeakTopicDiagnostic[] = weakAttempts.map((item, idx) => {
              const pct = Math.round((item.score / item.total_marks) * 100);
              const fallback = DEFAULT_RECOMMENDED_TOPICS[idx % DEFAULT_RECOMMENDED_TOPICS.length];
              return {
                subject: fallback.subject,
                topic: fallback.topic,
                scorePercent: pct,
                reason: `Scored ${pct}% on recent mock checkpoint. Recommended for reinforcement.`,
              };
            });
            setDiagnostics(detected);
          }
        }
      } catch {
        // Keep defaults if table query is restricted
      } finally {
        if (active) setLoadingDiagnostics(false);
      }
    }

    void fetchWeakness();
    return () => {
      active = false;
    };
  }, [userId]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || !drill) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, drill]);

  async function handleGenerateDrill(selectedSubject?: string, selectedTopic?: string) {
    const sub = selectedSubject || subject;
    const top = selectedTopic !== undefined ? selectedTopic : topic;

    setLoadingDrill(true);
    setDrillError("");
    setAddedToPlan(false);
    setSelectedAnswers({});
    setRevealedSolutions({});
    setAddedToDeck({});
    setActiveQuestionIndex(0);
    setTimerSeconds(300);
    setTimerActive(false);

    try {
      const res = await fetch("/api/learning/revision/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: sub,
          topic: top,
          examType,
          weaknessNote: top ? `Candidate needs reinforcement in ${top}` : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Could not generate AI drill. Check connection and retry.");
      }

      const data = await res.json();
      if (!data.ok || !data.drill) {
        throw new Error(data.error || "Failed to load drill");
      }

      setDrill(data.drill);
      setSubject(data.drill.subject);
      setTopic(data.drill.topic);
      setTimerActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Drill generation failed";
      setDrillError(msg);
    } finally {
      setLoadingDrill(false);
    }
  }

  function handleSelectOption(qId: string, option: "A" | "B" | "C" | "D") {
    if (selectedAnswers[qId]) return; // Answer locked once picked
    setSelectedAnswers((prev) => ({ ...prev, [qId]: option }));
    setRevealedSolutions((prev) => ({ ...prev, [qId]: true }));
  }

  async function handleAddToSpacedRepetition(question: RevisionDrillQuestion) {
    if (addedToDeck[question.id]) return;
    try {
      await enqueueMissedQuestion({
        questionId: `drill_${drill?.id}_${question.id}`,
        subject: drill?.subject || subject,
        category: drill?.topic || "Revision Drill",
        questionText: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
      });
      setAddedToDeck((prev) => ({ ...prev, [question.id]: true }));
      if (onDeckUpdated) onDeckUpdated();
    } catch (err) {
      console.warn("Could not queue drill card:", err);
    }
  }

  function handleAddDrillToPlan() {
    if (!drill || !onAddTopicToPlan || addedToPlan) return;
    onAddTopicToPlan(drill.topic, drill.subject);
    setAddedToPlan(true);
  }

  // Drill scoring summary
  const scoreStats = useMemo(() => {
    if (!drill) return { total: 0, answered: 0, correct: 0, percentage: 0 };
    const total = drill.questions.length;
    let answered = 0;
    let correct = 0;
    drill.questions.forEach((q) => {
      const userPick = selectedAnswers[q.id];
      if (userPick) {
        answered++;
        if (userPick === q.correctAnswer) correct++;
      }
    });
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, answered, correct, percentage };
  }, [drill, selectedAnswers]);

  const currentQ = drill?.questions[activeQuestionIndex];

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <section className="mb-8 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 p-6 shadow-sm sm:p-8">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-900">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            <span>AI Weak-Topic Diagnostic &amp; Rapid Drill</span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Targeted Checkpoint Practice Arena
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Diagnose syllabus weaknesses from past tests or choose a high-yield topic. Generate an authentic 5-question drill with step-by-step worked solutions.
          </p>
        </div>

        {drill && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black text-white ${
                timerSeconds < 60 ? "bg-red-600 animate-pulse" : "bg-[#061a3a]"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              <span>{formatTimer(timerSeconds)}</span>
            </span>
            <button
              type="button"
              onClick={() => setTimerActive((prev) => !prev)}
              aria-label={timerActive ? "Pause drill timer" : "Resume drill timer"}
              className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center"
            >
              {timerActive ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Diagnosed Weak Topics Quick Selector */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-white/80 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            <span>Diagnosed High-Yield Focus Areas</span>
          </p>
          <span className="text-[11px] font-semibold text-slate-500">
            Click to auto-generate 5-question drill
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {diagnostics.map((diag) => (
            <button
              key={`${diag.subject}-${diag.topic}`}
              type="button"
              disabled={loadingDrill}
              onClick={() => {
                setSubject(diag.subject);
                setTopic(diag.topic);
                void handleGenerateDrill(diag.subject, diag.topic);
              }}
              className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:border-blue-500 hover:bg-blue-50 active:scale-95 disabled:opacity-50"
            >
              <span className="text-blue-600 font-extrabold">{diag.subject}:</span>
              <span>{diag.topic}</span>
              {typeof diag.scorePercent === "number" && (
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-900">
                  {diag.scorePercent}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Topic Custom Selector & Generator Form */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr_140px_auto]">
        <div>
          <label htmlFor="drill-subject" className="sr-only">Subject</label>
          <select
            id="drill-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loadingDrill}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
          >
            {SUBJECT_OPTIONS.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="drill-topic" className="sr-only">Topic</label>
          <input
            id="drill-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter specific topic (e.g. Electrolysis, Trigonometry)..."
            disabled={loadingDrill}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label htmlFor="drill-exam-type" className="sr-only">Exam Type</label>
          <select
            id="drill-exam-type"
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            disabled={loadingDrill}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800"
          >
            {EXAM_TYPE_OPTIONS.map((ext) => (
              <option key={ext} value={ext}>{ext}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => void handleGenerateDrill()}
          disabled={loadingDrill}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#012153] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0c316d] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingDrill ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              <span>Generate Drill</span>
            </>
          )}
        </button>
      </div>

      {drillError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-900 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          <span>{drillError}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loadingDrill && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-8 text-center animate-pulse">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 text-blue-800 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 2.05.8 3.92 2.1 5.3L6 19h12l-.6-4.2a7.48 7.48 0 0 0 2.1-5.3A7.5 7.5 0 0 0 12 2z"/><path d="M9 19v3h6v-3"/></svg>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-900">
            Synthesizing High-Yield Exam Drill...
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Consulting JAMB/WAEC syllabus frequency matrices, isolating core trap distractors, and formulating step-by-step explanations.
          </p>
        </div>
      )}

      {/* Drill Active Arena */}
      {!loadingDrill && drill && (
        <div className="mt-6">
          {/* Sub-navigation tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("drill")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeTab === "drill"
                    ? "bg-[#061a3a] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>Interactive 5-Question Drill ({scoreStats.answered}/{scoreStats.total})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cheatSheet")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                  activeTab === "cheatSheet"
                    ? "bg-[#061a3a] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
                <span>Concept &amp; Formula Sheet</span>
              </button>
            </div>

            {onAddTopicToPlan && (
              <button
                type="button"
                onClick={handleAddDrillToPlan}
                disabled={addedToPlan}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-900 hover:bg-blue-50 transition disabled:opacity-50"
              >
                {addedToPlan ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Added to Checklist</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    <span>Add to Revision Plan</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* TAB 1: Drill Player */}
          {activeTab === "drill" && currentQ && (
            <div className="mt-5 rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              {/* Question metadata & stepper */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-900">
                    Question {activeQuestionIndex + 1} of {drill.questions.length}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                    {drill.subject} · {drill.topic}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                      currentQ.difficulty === "Easy"
                        ? "bg-emerald-100 text-emerald-900"
                        : currentQ.difficulty === "Medium"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-purple-100 text-purple-900"
                    }`}
                  >
                    {currentQ.difficulty}
                  </span>
                </div>
              </div>

              {/* Question body */}
              <div className="mt-4">
                <h3 className="text-base font-bold leading-relaxed text-slate-900 sm:text-lg">
                  {currentQ.question}
                </h3>

                {/* Options Grid */}
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {(["A", "B", "C", "D"] as const).map((key) => {
                    const text = currentQ.options[key];
                    const isSelected = selectedAnswers[currentQ.id] === key;
                    const isCorrect = currentQ.correctAnswer === key;
                    const isAnswered = Boolean(selectedAnswers[currentQ.id]);

                    let btnStyle = "border-slate-200 bg-slate-50/50 text-slate-800 hover:bg-slate-100";
                    if (isAnswered) {
                      if (isCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-50 font-extrabold text-emerald-950";
                      } else if (isSelected && !isCorrect) {
                        btnStyle = "border-red-400 bg-red-50 font-extrabold text-red-950";
                      } else {
                        btnStyle = "border-slate-200 bg-slate-50/40 text-slate-400 opacity-70";
                      }
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(currentQ.id, key)}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition ${btnStyle}`}
                      >
                        <span className="flex-shrink-0 font-black">{key}.</span>
                        <span className="min-w-0 flex-1">{text}</span>
                        {isAnswered && isCorrect && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                        {isAnswered && isSelected && !isCorrect && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Worked Explanation Card (shown once answered) */}
              {revealedSolutions[currentQ.id] && (
                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 transition animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a6 6 0 0 0-6 6c0 2.2 1.3 4 3 5v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2c1.7-1 3-2.8 3-5a6 6 0 0 0-6-6Z"/><path d="M9 22h6"/></svg>
                      <span>Worked Solution &amp; Examiner Tip</span>
                    </p>
                    <span className="text-xs font-bold text-indigo-950">
                      Correct: Option {currentQ.correctAnswer}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {currentQ.explanation}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100/80 pt-3">
                    <p className="text-xs font-semibold text-slate-500">
                      Want to retain this formula for upcoming exams?
                    </p>
                    <button
                      type="button"
                      disabled={addedToDeck[currentQ.id]}
                      onClick={() => void handleAddToSpacedRepetition(currentQ)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-950 transition disabled:opacity-50"
                    >
                      {addedToDeck[currentQ.id] ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                          <span>Added to Daily SM-2</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 2.05.8 3.92 2.1 5.3L6 19h12l-.6-4.2a7.48 7.48 0 0 0 2.1-5.3A7.5 7.5 0 0 0 12 2z"/></svg>
                          <span>Add to Daily SM-2 Deck</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation stepper buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={activeQuestionIndex === 0}
                  onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1.5">
                  {drill.questions.map((q, idx) => {
                    const isAns = Boolean(selectedAnswers[q.id]);
                    const isRight = selectedAnswers[q.id] === q.correctAnswer;
                    let dotColor = "bg-slate-200 text-slate-600";
                    if (isAns) {
                      dotColor = isRight ? "bg-emerald-500 text-white" : "bg-red-500 text-white";
                    }
                    if (idx === activeQuestionIndex) {
                      dotColor += " ring-2 ring-blue-700 ring-offset-2";
                    }
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`h-7 w-7 rounded-lg text-xs font-black transition ${dotColor}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={activeQuestionIndex >= drill.questions.length - 1}
                  onClick={() => setActiveQuestionIndex((prev) => Math.min(drill.questions.length - 1, prev + 1))}
                  className="rounded-xl bg-[#061a3a] px-4 py-2 text-xs font-bold text-white hover:bg-[#123566] transition disabled:opacity-40"
                >
                  Next →
                </button>
              </div>

              {/* Completion Banner */}
              {scoreStats.answered === scoreStats.total && (
                <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  </div>
                  <h4 className="mt-2 text-lg font-black text-emerald-950">
                    Drill Completed: {scoreStats.correct} / {scoreStats.total} Correct ({scoreStats.percentage}%)
                  </h4>
                  <p className="mt-1 text-xs text-emerald-800">
                    {scoreStats.percentage >= 80
                      ? "Outstanding mastery of this topic! Keep practicing to maintain speed."
                      : "Good effort! Review the worked solutions and practice again to eliminate errors."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handleGenerateDrill()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                      <span>Retake / New 5-Question Drill</span>
                    </button>
                    {onAddTopicToPlan && (
                      <button
                        type="button"
                        onClick={handleAddDrillToPlan}
                        disabled={addedToPlan}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-100 transition disabled:opacity-50"
                      >
                        {addedToPlan ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>In Checklist</span>
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                            <span>Add Topic to Revision Checklist</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Concept & Formula Sheet */}
          {activeTab === "cheatSheet" && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  <span>Diagnostic Context</span>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {drill.diagnosticSummary}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-900 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  <span>Essential Formulas &amp; Principles</span>
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {drill.keyFormulasOrRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5"
                    >
                      <code className="block font-mono text-xs font-bold text-blue-950">
                        {rule.rule}
                      </code>
                      <p className="mt-1.5 text-xs text-blue-800">
                        {rule.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-950 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  <span>Common Traps in UTME / WAEC Past Questions</span>
                </h3>
                <ul className="mt-3 space-y-2 text-xs font-medium text-amber-900">
                  {drill.commonTraps.map((trap, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{trap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
