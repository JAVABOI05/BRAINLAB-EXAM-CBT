"use client";

export const dynamic = "force-dynamic";

import "./corrections.css";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicSettings, getResultCorrections, isError } from "../lib/examApi";
import { streamAiTutor, type AiCoachContext } from "../lib/aiTutor";
import { cleanAIResponse, cleanQuestionText, cleanAnswerKeyNote } from "../lib/cleanText";
import QuestionAITutor from "./QuestionAITutor";
import { recordTopicAttempt } from "../lib/adaptiveEngine";
import { enqueueMissedQuestion } from "../lib/spacedRepetition";

type ResultItem = {
  id: string | number;
  subject: string;
  type?: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  optionImages?: Partial<Record<"A" | "B" | "C" | "D", string | null>>;
  optionImageAlts?: Partial<Record<"A" | "B" | "C" | "D", string>>;
  questionImageUrl?: string | null;
  questionImageAlt?: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  explanationImageUrl?: string | null;
  explanationImageAlt?: string;
  userAnswer: "A" | "B" | "C" | "D" | null;
  isCorrect: boolean;
  flagged?: boolean;
  marks?: number;
};

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  code: string;
};

function safeImageUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isSyntheticPreviewData(items: unknown[]): boolean {
  if (items.length < 3) return false;

  const records = items.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null
  );
  if (records.length !== items.length) return false;

  const syntheticQuestions = records.filter((item) =>
    /^synthetic\b/i.test(String(item.text ?? "").trim())
  ).length;
  const syntheticOptions = records.filter((item) => {
    const options = item.options;
    if (!options || typeof options !== "object") return false;
    const values = options as Record<string, unknown>;
    return (["A", "B", "C", "D"] as const).every((key) =>
      /^option [A-D]\s*\d+$/i.test(String(values[key] ?? "").trim())
    );
  }).length;
  const syntheticExplanations = records.filter((item) =>
    /^synthetic explanation\b/i.test(String(item.explanation ?? "").trim())
  ).length;

  return (
    syntheticQuestions / records.length >= 0.75 &&
    syntheticOptions / records.length >= 0.75 &&
    syntheticExplanations / records.length >= 0.5
  );
}

function CorrectionStudyCoach({
  results,
  summary,
  subjectStats,
}: {
  results: ResultItem[];
  summary: { total: number; correct: number; wrong: number; unanswered: number };
  subjectStats: Record<string, { total: number; correct: number; wrong: number; unanswered: number }>;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedPlan, setSavedPlan] = useState(false);

  function savePlanToDashboard() {
    const cleanedPlan = cleanAIResponse(answer);
    if (!cleanedPlan) return;
    try {
      localStorage.setItem(
        "brainlab_saved_revision_plan",
        JSON.stringify({
          plan: cleanedPlan,
          date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
          score: summary.correct,
          total: summary.total,
        })
      );
      setSavedPlan(true);
    } catch {}
  }

  async function generatePlan() {
    if (busy || !results.length) return;
    setBusy(true);
    setAnswer("");
    setError("");

    const context: AiCoachContext = {
      summary,
      subjectStats,
      missedQuestions: results
        .filter((item) => item.userAnswer !== null && !item.isCorrect)
        .slice(0, 12)
        .map((item) => ({
          subject: item.subject,
          text: item.text.slice(0, 700),
          correctAnswer: item.correctAnswer,
        })),
    };

    try {
      await streamAiTutor(
        {
          mode: "coach",
          context,
          messages: [
            {
              role: "user",
              content:
                "Using these exam correction results and sample of missed questions, provide a targeted 3-point revision plan. Focus on conceptual gaps and concrete test strategies. Keep the tone encouraging and actionable. Keep it concise (under 180 words). Never use markdown hashtags (#) or asterisks (* or **). Write in clean plain text only using numbers (1., 2., 3.).",
            },
          ],
        },
        (chunk) => setAnswer((current) => current + chunk)
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not generate revision guidance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50/80 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-900">
            BrainLab AI Tutor · Study Coach
          </p>
          <h2 className="mt-1.5 text-xl font-black text-slate-950">
            Turn your corrections into a targeted revision plan
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Generate pedagogical revision guidance from your actual score breakdown and missed questions.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || !results.length}
          onClick={() => void generatePlan()}
          className="min-h-11 rounded-xl bg-[#061a3a] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#123566] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Building Plan…" : "✨ Build My Revision Plan →"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-3.5 text-sm text-red-800">
          {error}
        </p>
      )}
      {answer && (
        <div className="mt-5 space-y-3">
          <div
            className="whitespace-pre-wrap rounded-xl border border-cyan-100 bg-white p-5 text-sm leading-7 text-slate-800 shadow-inner"
            aria-live="polite"
          >
            {cleanAIResponse(answer)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={savePlanToDashboard}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-sm transition ${
                savedPlan
                  ? "bg-emerald-700 text-white"
                  : "bg-[#061a3a] text-white hover:bg-[#123566]"
              }`}
            >
              {savedPlan ? "✓ Saved to Learner Dashboard" : "💾 Save Plan to Dashboard"}
            </button>
            <a
              href="/dashboard"
              className="text-xs font-bold text-cyan-900 hover:underline"
            >
              View in Dashboard →
            </a>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-500">
        AI guidance is powered by Google AI Studio. Always verify deductions with your course textbooks.
      </p>
    </section>
  );
}

export default function CorrectionsPage() {
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState("");
  const [dataIssue, setDataIssue] = useState("");

  useEffect(() => {
    async function loadReleasedCorrections() {
      const settings = await getPublicSettings();
      if (!settings?.show_results) {
        router.replace("/result");
        return;
      }

      const savedSummary = localStorage.getItem("exam_summary");
      const savedCandidate = localStorage.getItem("candidate");

      if (!savedSummary) {
        router.replace("/result");
        return;
      }

      try {
        const parsedSummary = JSON.parse(savedSummary) as { result_id?: unknown; show_results?: unknown };
        if (typeof parsedSummary.result_id !== "string" || parsedSummary.show_results !== true) {
          router.replace("/result");
          return;
        }
        if (savedCandidate) {
          setCandidate(JSON.parse(savedCandidate) as Candidate);
        }

        // Fetch authoritative corrections securely from server by result_id
        const res = await getResultCorrections(parsedSummary.result_id);
        let items: unknown[] | null = null;
        if (!isError(res) && res.ok && Array.isArray(res.items) && res.items.length > 0) {
          items = res.items;
        } else {
          // Fallback to local session storage if available
          const savedResults = localStorage.getItem("exam_result");
          if (savedResults) {
            try {
              const parsed = JSON.parse(savedResults);
              if (Array.isArray(parsed)) items = parsed;
            } catch {
              items = null;
            }
          }
        }

        if (!items || !Array.isArray(items)) {
          router.replace("/result");
          return;
        }

        if (isSyntheticPreviewData(items)) {
          setResults([]);
          setDataIssue(
            "This preview contains placeholder test questions rather than answers from your verified exam attempt. Placeholder data has been withheld. Please take a CBT exam to review genuine question corrections."
          );
          setLoading(false);
          return;
        }

        setResults(items as ResultItem[]);
        const firstSubject = (items as ResultItem[]).find((item) => item.subject?.trim())?.subject;
        if (firstSubject) setActiveSubject(firstSubject);

        // Feed Adaptive Learning Engine & Spaced Repetition queue
        (items as ResultItem[]).forEach((resItem) => {
          void recordTopicAttempt(resItem.subject, "Exam Question", resItem.isCorrect);
          if (!resItem.isCorrect) {
            void enqueueMissedQuestion({
              questionId: resItem.id,
              subject: resItem.subject,
              category: "Exam Question",
              questionText: resItem.text,
              options: resItem.options,
              correctAnswer: resItem.correctAnswer,
            });
          }
        });
        setLoading(false);
      } catch {
        router.replace("/result");
      }
    }

    void loadReleasedCorrections();
  }, [router]);

  const summary = useMemo(() => {
    const total = results.length;
    const correct = results.filter((item) => item.isCorrect).length;
    const wrong = results.filter(
      (item) => item.userAnswer !== null && !item.isCorrect
    ).length;
    const unanswered = results.filter((item) => item.userAnswer === null).length;

    return { total, correct, wrong, unanswered };
  }, [results]);

  const subjects = useMemo(() => {
    const uniqueSubjects = Array.from(
      new Set(results.map((item) => item.subject))
    );
    return uniqueSubjects;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (!activeSubject) return results;
    return results.filter((item) => item.subject === activeSubject);
  }, [results, activeSubject]);

  const subjectStats = useMemo(() => {
    const stats: Record<
      string,
      { total: number; correct: number; wrong: number; unanswered: number }
    > = {};

    results.forEach((item) => {
      if (!stats[item.subject]) {
        stats[item.subject] = {
          total: 0,
          correct: 0,
          wrong: 0,
          unanswered: 0,
        };
      }

      stats[item.subject].total += 1;

      if (item.userAnswer === null) {
        stats[item.subject].unanswered += 1;
      } else if (item.isCorrect) {
        stats[item.subject].correct += 1;
      } else {
        stats[item.subject].wrong += 1;
      }
    });

    return stats;
  }, [results]);

  const scrollToQuestion = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getPaletteClass = (item: ResultItem) => {
    if (item.userAnswer === null) return "unanswered";
    if (item.isCorrect) return "correct";
    return "wrong";
  };

  const getOptionClass = (
    optionKey: "A" | "B" | "C" | "D",
    item: ResultItem
  ) => {
    const isCorrect = item.correctAnswer === optionKey;
    const isSelected = item.userAnswer === optionKey;

    if (isCorrect) return "correct";
    if (isSelected && !item.isCorrect) return "wrong";
    return "default";
  };

  if (loading) {
    return (
      <main className="corrections-page">
        <div className="corrections-shell">
          <div className="empty-state">
            <p className="empty-state-text">Loading corrections...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="corrections-page">
      <div className="corrections-shell">
        <section className="corrections-hero">
          <div className="corrections-hero-inner">
            <div>
              <span className="corrections-badge">BrainLab CBT</span>
              <h1 className="corrections-title">Corrections & Review</h1>
              <p className="corrections-subtitle">
                Review every answer clearly. Switch by subject, jump to any
                question, and see which responses were correct, wrong, or
                unanswered.
              </p>
            </div>

            {candidate && (
              <div className="candidate-panel">
                <div>
                  <div className="candidate-block-label">Candidate</div>
                  <div className="candidate-block-value">{candidate.name}</div>
                </div>

                <div>
                  <div className="candidate-block-label">Phone</div>
                  <div className="candidate-block-value">{candidate.phone}</div>
                </div>

                <div>
                  <div className="candidate-block-label">Elective</div>
                  <div className="candidate-block-value">{candidate.subject}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card total">
            <div className="stat-label">Total Questions</div>
            <div className="stat-value">{summary.total}</div>
          </div>

          <div className="stat-card correct">
            <div className="stat-label">Correct</div>
            <div className="stat-value">{summary.correct}</div>
          </div>

          <div className="stat-card wrong">
            <div className="stat-label">Wrong</div>
            <div className="stat-value">{summary.wrong}</div>
          </div>

          <div className="stat-card unanswered">
            <div className="stat-label">Unanswered</div>
            <div className="stat-value">{summary.unanswered}</div>
          </div>
        </section>

        {dataIssue && (
          <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-900 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h2 className="text-base font-bold">Preview Notice</h2>
                <p className="mt-1 text-sm leading-6 text-amber-800">{dataIssue}</p>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mb-6">
            <CorrectionStudyCoach
              results={results}
              summary={summary}
              subjectStats={subjectStats}
            />
          </div>
        )}

        <div className="main-grid">
          <aside className="sidebar">
            <section className="side-card">
              <h2 className="side-card-title">Subject Navigation</h2>
              <p className="side-card-subtitle">
                Choose a subject to review its questions and numbering independently.
              </p>

              <div className="subject-list">
                {subjects.map((subject) => {
                  const stats =
                    subject === "All"
                      ? summary
                      : subjectStats[subject] ?? {
                          total: 0,
                          correct: 0,
                          wrong: 0,
                          unanswered: 0,
                        };

                  const isActive = activeSubject === subject;

                  return (
                    <button
                      key={subject}
                      type="button"
                      className={`subject-btn ${isActive ? "active" : ""}`}
                      onClick={() => setActiveSubject(subject)}
                    >
                      <div className="subject-btn-top">
                        <span className="subject-name">{subject}</span>
                        <span className="subject-count">{stats.total}</span>
                      </div>

                      <div className="subject-meta">
                        <span>✔ {stats.correct}</span>
                        <span>✖ {stats.wrong}</span>
                        <span>• {stats.unanswered}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="side-card">
              <h2 className="side-card-title">Question Palette</h2>
              <p className="side-card-subtitle">
                Numbers restart for each subject. Select a question to jump to it.
              </p>

              <div className="palette-grid">
                {filteredResults.map((item, index) => {
                  const questionId = `question-${activeSubject}-${index}-${item.id}`;

                  return (
                    <button
                      key={questionId}
                      type="button"
                      className={`palette-btn ${getPaletteClass(item)}`}
                      onClick={() => scrollToQuestion(questionId)}
                      title={`Go to question ${index + 1}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="legend">
                <div className="legend-item">
                  <span className="legend-dot correct"></span>
                  <span>Correct</span>
                </div>

                <div className="legend-item">
                  <span className="legend-dot wrong"></span>
                  <span>Wrong</span>
                </div>

                <div className="legend-item">
                  <span className="legend-dot unanswered"></span>
                  <span>Unanswered</span>
                </div>
              </div>
            </section>
          </aside>

          <section className="questions-column">
            {filteredResults.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state-text">
                  No questions found for this subject.
                </p>
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const questionId = `question-${activeSubject}-${index}-${item.id}`;

                return (
                  <article
                    key={questionId}
                    id={questionId}
                    className="question-card"
                  >
                    <div className="question-head">
                      <div className="question-head-row">
                        <div>
                          <div className="question-tags">
                            <span className="tag subject">{item.subject}</span>

                            {item.type && (
                              <span className="tag type">{item.type}</span>
                            )}

                            <span className="tag number">
                              Question {index + 1}
                            </span>
                          </div>

                          <h2 className="question-text">{cleanQuestionText(item.text)}</h2>
                          {safeImageUrl(item.questionImageUrl) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={safeImageUrl(item.questionImageUrl)!}
                              alt={item.questionImageAlt?.trim() || "Question illustration"}
                              loading="lazy"
                              className="mt-3 block max-h-96 w-auto max-w-full rounded-lg border border-gray-200 object-contain"
                            />
                          )}
                        </div>

                        <div>
                          {item.userAnswer === null ? (
                            <span className="status-pill unanswered">
                              Unanswered
                            </span>
                          ) : item.isCorrect ? (
                            <span className="status-pill correct">Correct</span>
                          ) : (
                            <span className="status-pill wrong">Wrong</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="question-body">
                      <div className="options-list">
                        {(["A", "B", "C", "D"] as const).map((key) => (
                          <div
                            key={key}
                            className={`option-box ${getOptionClass(key, item)}`}
                          >
                            <div className="option-key">{key}</div>
                            <div className="option-text">
                              {item.options[key]}
                              {safeImageUrl(item.optionImages?.[key]) && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={safeImageUrl(item.optionImages?.[key])!}
                                  alt={item.optionImageAlts?.[key]?.trim() || `Option ${key} illustration`}
                                  loading="lazy"
                                  className="mt-2 block max-h-64 w-auto max-w-full rounded-lg object-contain"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="answer-grid">
                        <div className="answer-card your-answer">
                          <div className="answer-label">Your Answer</div>
                          <div className="answer-value">
                            {item.userAnswer ?? "Not answered"}
                          </div>
                        </div>

                        <div className="answer-card correct-answer">
                          <div className="answer-label">Correct Answer</div>
                          <div className="answer-value">{item.correctAnswer}</div>
                        </div>

                        <div className="answer-card marks">
                          <div className="answer-label">Marks</div>
                          <div className="answer-value">{item.marks ?? 1}</div>
                        </div>
                      </div>

                      {/* BrainLab AI Tutor breakdown */}
                      <QuestionAITutor item={item} questionNumber={index + 1} />

                      {cleanAnswerKeyNote(item.explanation) && (
                        <div className="explanation-box">
                          <h3 className="explanation-title">Original Answer Key Note</h3>
                          <p className="explanation-text">{cleanAnswerKeyNote(item.explanation)}</p>
                          {safeImageUrl(item.explanationImageUrl) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={safeImageUrl(item.explanationImageUrl)!}
                              alt={item.explanationImageAlt?.trim() || "Explanation illustration"}
                              loading="lazy"
                              className="mt-3 block max-h-96 w-auto max-w-full rounded-lg object-contain"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
            )}

            <div className="corrections-actions">
              <button
                type="button"
                className="action-btn secondary"
                onClick={() => router.push("/result")}
              >
                Back to Result
              </button>

              <button
                type="button"
                className="action-btn primary"
                onClick={() => router.push("/")}
              >
                Back Home
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}