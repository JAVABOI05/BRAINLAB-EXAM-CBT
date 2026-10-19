"use client";

import "./corrections.css";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicSettings } from "../lib/examApi";

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

  // Only flag a clear fixture pattern, never an isolated question that happens
  // to contain the word "synthetic".
  return (
    syntheticQuestions / records.length >= 0.75 &&
    syntheticOptions / records.length >= 0.75 &&
    syntheticExplanations / records.length >= 0.5
  );
}

export default function CorrectionsPage() {
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState("All");
  const [dataIssue, setDataIssue] = useState("");

  useEffect(() => {
    async function loadReleasedCorrections() {
      // Never trust cached review data as proof that results are currently released.
      const settings = await getPublicSettings();
      if (!settings?.show_results) {
        router.replace("/result");
        return;
      }

      const savedSummary = localStorage.getItem("exam_summary");
      const savedCandidate = localStorage.getItem("candidate");
      const savedResults = localStorage.getItem("exam_result");

      if (!savedResults || !savedSummary) {
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

        const parsedResults = JSON.parse(savedResults);
        if (!Array.isArray(parsedResults)) {
          router.replace("/result");
          return;
        }

        if (isSyntheticPreviewData(parsedResults)) {
          // Preview fixtures must never be presented as a learner's real exam.
          setResults([]);
          setDataIssue(
            "This preview is returning placeholder questions instead of the questions from your exam attempt. The placeholder data has been withheld. Start or submit a real CBT attempt to generate genuine corrections."
          );
          setLoading(false);
          return;
        }

        setResults(parsedResults as ResultItem[]);
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
    return ["All", ...uniqueSubjects];
  }, [results]);

  const filteredResults = useMemo(() => {
    if (activeSubject === "All") return results;
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

        <div className="main-grid">
          <aside className="sidebar">
            <section className="side-card">
              <h2 className="side-card-title">Subject Navigation</h2>
              <p className="side-card-subtitle">
                Switch between subjects and review performance quickly.
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
                Jump directly to any question from here.
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
                  {dataIssue || "No questions found for this subject."}
                </p>
                {dataIssue && (
                  <button
                    type="button"
                    className="action-btn primary mt-4"
                    onClick={() => router.push("/")}
                  >
                    Return to BrainLab Home
                  </button>
                )}
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

                          <h2 className="question-text">{item.text}</h2>
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

                      {item.explanation && (
                        <div className="explanation-box">
                          <h3 className="explanation-title">Explanation</h3>
                          <p className="explanation-text">{item.explanation}</p>
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