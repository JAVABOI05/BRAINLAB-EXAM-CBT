"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { recordLearningActivity } from "../../lib/gamification";

interface AssessmentInfo {
  id: string;
  title: string;
  description?: string;
  assessment_type: "organisation_quiz" | "competition";
  question_count: number;
  duration_seconds: number | null;
  max_attempts: number;
  access_code_required: boolean;
  result_release: string;
}

interface QuestionItem {
  id: number;
  subject: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  question_image_url?: string;
}

export default function AssessmentRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id as string;

  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptToken, setAttemptToken] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);

  const [phase, setPhase] = useState<"briefing" | "running" | "submitting" | "completed">("briefing");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultScore, setResultScore] = useState<{ score: number; total: number; percentage: number } | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load assessment metadata
  useEffect(() => {
    let active = true;

    async function loadMeta() {
      setLoading(true);
      setError("");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace(`/login?next=/assessments/${assessmentId}`);
        return;
      }

      const { data, error: err } = await supabase
        .from("learning_assessments")
        .select("id, title, description, assessment_type, question_count, duration_seconds, max_attempts, access_code_required, result_release")
        .eq("id", assessmentId)
        .eq("is_published", true)
        .single();

      if (!active) return;

      if (err || !data) {
        setError("Assessment not found or is currently closed.");
      } else {
        setAssessment(data as AssessmentInfo);
      }
      setLoading(false);
    }

    if (assessmentId) void loadMeta();

    return () => {
      active = false;
    };
  }, [assessmentId, router]);

  // 2. Timer tick
  useEffect(() => {
    if (phase !== "running" || !deadline) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 1000));
      setTimeLeftSec(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        void handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, deadline]);

  // 3. Start Assessment
  async function handleStart() {
    setError("");
    setLoading(true);

    try {
      const { data, error: rpcErr } = await supabase.rpc("start_organisation_assessment", {
        p_assessment_id: assessmentId,
        p_access_code: accessCode.trim() || null,
      });

      if (rpcErr || !data?.ok) {
        setError(data?.message || rpcErr?.message || "Failed to start assessment.");
        setLoading(false);
        return;
      }

      setAttemptId(data.attempt_id);
      setAttemptToken(data.attempt_token);
      setQuestions(data.questions || []);

      if (data.deadline_at) {
        const d = new Date(data.deadline_at);
        setDeadline(d);
        setTimeLeftSec(Math.max(0, Math.floor((d.getTime() - Date.now()) / 1000)));
      }

      setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error starting assessment.");
    } finally {
      setLoading(false);
    }
  }

  // 4. Select answer & autosave
  function handleSelectOption(option: "A" | "B" | "C" | "D") {
    const q = questions[currentIndex];
    if (!q) return;

    const nextAnswers = { ...answers, [String(q.id)]: option };
    setAnswers(nextAnswers);

    // Debounced autosave
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (attemptId && attemptToken) {
        void supabase.rpc("save_organisation_assessment_progress", {
          p_attempt_id: attemptId,
          p_attempt_token: attemptToken,
          p_answers: nextAnswers,
        });
      }
    }, 1200);
  }

  // 5. Submit Attempt
  const submitAttempt = useCallback(async () => {
    if (!attemptId || !attemptToken) return;
    setPhase("submitting");

    try {
      const { data, error: submitErr } = await supabase.rpc("submit_organisation_assessment", {
        p_attempt_id: attemptId,
        p_attempt_token: attemptToken,
        p_answers: answers,
      });

      if (submitErr || !data?.ok) {
        setError(data?.message || "Failed to finalize submission.");
        setPhase("running");
        return;
      }

      if (data.score !== undefined) {
        setResultScore({
          score: Number(data.score),
          total: Number(data.total),
          percentage: Number(data.percentage || 0),
        });
      }

      void recordLearningActivity("competition", assessmentId, Number(data.percentage || 0));
      setPhase("completed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission error.");
      setPhase("running");
    }
  }, [attemptId, attemptToken, answers]);

  async function handleAutoSubmit() {
    await submitAttempt();
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  if (loading && phase === "briefing") {
    return (
      <div className="assessment-detail-page flex min-h-screen flex-col bg-slate-50 text-slate-900">
                <main className="flex flex-1 items-center justify-center p-6">
          <p className="text-sm font-semibold text-slate-500">Loading assessment details...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="assessment-detail-page flex min-h-screen flex-col bg-slate-50 text-slate-900">
      
      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {error && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
              {error}
            </div>
          )}

          {/* PHASE 1: Briefing & Access Code */}
          {phase === "briefing" && assessment && (
            <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-sm">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-700 border border-indigo-200">
                {assessment.assessment_type === "competition" ? "🏆 Official Competition" : "📝 Organisation Assessment"}
              </span>
              <h1 className="mt-4 text-3xl font-black text-slate-950">{assessment.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {assessment.description || "Review the parameters below before beginning your attempt."}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-400 block font-bold uppercase">Questions</span>
                  <span className="mt-1 text-xl font-black text-slate-900">{assessment.question_count}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-400 block font-bold uppercase">Timer</span>
                  <span className="mt-1 text-xl font-black text-slate-900">
                    {assessment.duration_seconds ? `${Math.round(assessment.duration_seconds / 60)} mins` : "Untimed"}
                  </span>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-400 block font-bold uppercase">Attempts</span>
                  <span className="mt-1 text-xl font-black text-slate-900">{assessment.max_attempts}</span>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-slate-400 block font-bold uppercase">Scoring</span>
                  <span className="mt-1 text-sm font-bold text-slate-900">Auto-Graded</span>
                </div>
              </div>

              {assessment.access_code_required && (
                <div className="mt-6 rounded-2xl bg-amber-50/70 border border-amber-200 p-5">
                  <label className="block text-xs font-bold text-amber-950 uppercase">
                    🔑 Access Code Required
                  </label>
                  <p className="mt-1 text-xs text-amber-800">
                    Enter the access pass code issued by your institution or competition host:
                  </p>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BL-COMP-2026"
                    className="mt-2 w-full max-w-sm rounded-xl border border-amber-300 bg-white p-2.5 text-xs font-mono font-bold uppercase focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleStart}
                  className="rounded-xl bg-[#012153] px-8 py-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#0a2e70] transition"
                >
                  Start Assessment Now →
                </button>
                <Link
                  href="/assessments"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel &amp; Return
                </Link>
              </div>
            </div>
          )}

          {/* PHASE 2: Running Assessment */}
          {phase === "running" && questions.length > 0 && (
            <div>
              {/* Runner Header Bar */}
              <div className="sticky top-4 z-20 mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                    {assessment?.title}
                  </h2>
                  <span className="text-xs text-slate-500">
                    Question {currentIndex + 1} of {questions.length} · Answered{" "}
                    {Object.keys(answers).length} / {questions.length}
                  </span>
                </div>

                {timeLeftSec !== null && (
                  <div
                    className={`rounded-xl px-3 py-1.5 font-mono text-sm font-black ${
                      timeLeftSec < 120
                        ? "bg-rose-100 text-rose-700 animate-pulse"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    ⏱ {formatTime(timeLeftSec)}
                  </div>
                )}
              </div>

              {/* Question Card */}
              {(() => {
                const q = questions[currentIndex];
                const selected = answers[String(q.id)];

                return (
                  <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-sm">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                      {q.subject}
                    </span>

                    <h3 className="mt-3 text-lg font-medium leading-relaxed text-slate-950 sm:text-xl">
                      {q.question}
                    </h3>

                    {/* Options */}
                    <div className="mt-6 space-y-3">
                      {(["A", "B", "C", "D"] as const).map((optKey) => {
                        const optionKey = `option_${optKey.toLowerCase()}` as "option_a" | "option_b" | "option_c" | "option_d";
                        const optText = q[optionKey];
                        if (!optText) return null;
                        const isChosen = selected === optKey;

                        return (
                          <button
                            key={optKey}
                            type="button"
                            onClick={() => handleSelectOption(optKey)}
                            className={`flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
                              isChosen
                                ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                isChosen ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {optKey}
                            </span>
                            <span className="pt-0.5 text-sm font-medium text-slate-800">
                              {optText}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Navigation */}
                    <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
                      <button
                        type="button"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                      >
                        ← Previous
                      </button>

                      <div className="flex gap-2">
                        {currentIndex < questions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            Next Question →
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("Submit your finalized answers now?")) {
                                void submitAttempt();
                              }
                            }}
                            className="rounded-xl bg-emerald-600 px-6 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                          >
                            Finalize &amp; Submit ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Question Navigation Drawer */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Question Palette
                </span>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, idx) => {
                    const answered = Boolean(answers[String(q.id)]);
                    const isCurrent = idx === currentIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                          isCurrent
                            ? "bg-indigo-700 text-white ring-2 ring-indigo-400"
                            : answered
                            ? "bg-indigo-100 text-indigo-900 font-extrabold"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PHASE 3: Submitting */}
          {phase === "submitting" && (
            <div className="rounded-3xl border border-blue-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">Finalizing &amp; Scoring Attempt...</h2>
              <p className="mt-1 text-xs text-slate-500">
                Your answers are being graded securely on the server with atomic integrity.
              </p>
            </div>
          )}

          {/* PHASE 4: Completed */}
          {phase === "completed" && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-8 sm:p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
                ✓
              </div>
              <span className="mt-4 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase text-emerald-800">
                Attempt Finalized
              </span>
              <h2 className="mt-3 text-3xl font-black text-slate-950">Assessment Completed</h2>

              {resultScore ? (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Score</span>
                  <p className="mt-2 text-4xl font-black text-emerald-700">
                    {resultScore.score} / {resultScore.total}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-slate-700">{resultScore.percentage}%</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  Your answers have been recorded. Results will be released once the competition closes.
                </p>
              )}

              <div className="mt-8 flex justify-center gap-3">
                <Link
                  href="/assessments"
                  className="rounded-xl bg-[#012153] px-6 py-3 text-xs font-bold text-white hover:bg-[#0a2e70]"
                >
                  Back to Assessments
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  My Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
