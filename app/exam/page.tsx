"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPublicSettings, isError, recordTabSwitch, resumeExam, saveProgress, startExam, submitExam, type AttemptPayload, type FinishedPayload, type Option, type PaperQuestion } from "../lib/examApi";
import FloatingCalculator from "../components/FloatingCalculator";
import { cleanQuestionText } from "../lib/cleanText";

type QuestionRow = PaperQuestion;

type ElectiveSubject = "Biology" | "Mathematics";
type AnswersMap = Record<string, Option>;
type FlaggedMap = Record<string, boolean>;

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  code: string;
};

type QuestionWithIndex = QuestionRow & {
  originalIndex: number;
};

const DEFAULT_EXAM_DURATION = 2 * 60 * 60;


function getOptionValue(value: string | null | undefined): string {
  return value?.trim() || "";
}

function safeImageUrl(value: string | null | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => unit.toString().padStart(2, "0"))
    .join(":");
}

export default function ExamPage() {
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [electiveSubject, setElectiveSubject] = useState<ElectiveSubject | "">(
    ""
  );
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [flagged, setFlagged] = useState<FlaggedMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_EXAM_DURATION);
  const [examDuration, setExamDuration] = useState(DEFAULT_EXAM_DURATION);
  const [awayWarning, setAwayWarning] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorEnabled, setCalculatorEnabled] = useState(true);
  const [mockEnabled, setMockEnabled] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline">("synced");


  // Track network connectivity and auto-retry sync when online
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus("syncing");
      if (sessionId && sessionToken) {
        void saveProgress(sessionId, sessionToken, answers).then((saved) => {
          if (!isError(saved)) {
            setSyncStatus("synced");
          }
        });
      }
    };
    const handleOffline = () => {
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [sessionId, sessionToken, answers]);

  // Offline backup: cache active questions locally
  useEffect(() => {
    if (started && questions.length > 0) {
      try {
        localStorage.setItem("exam_questions_cached", JSON.stringify(questions));
      } catch {
        // Ignore quota
      }
    }
  }, [started, questions]);

  const submitLockRef = useRef(false);
  const tabSwitchCountRef = useRef(0);

  useEffect(() => {
    async function loadPageData() {
      const savedCandidate = localStorage.getItem("candidate");
      if (!savedCandidate) { router.push("/"); return; }
      let parsedCandidate: Candidate;
      try { parsedCandidate = JSON.parse(savedCandidate) as Candidate; }
      catch { router.push("/"); return; }
      setCandidate(parsedCandidate);
      if (parsedCandidate.subject === "Biology" || parsedCandidate.subject === "Mathematics") setElectiveSubject(parsedCandidate.subject);
      const settings = await getPublicSettings();
      if (!settings) { setError("Could not load exam settings. Check your connection and refresh the page."); return; }
      const duration = settings.exam_duration > 0 ? settings.exam_duration : DEFAULT_EXAM_DURATION;
      setExamDuration(duration); setTimeLeft(duration);
      setCalculatorEnabled(settings.calculator_enabled); setMockEnabled(settings.mock_enabled);
      if (!settings.mock_enabled) { router.push("/access"); return; }
      if (settings.access_code_required && !localStorage.getItem("access_code")) { router.push("/access"); return; }
      const savedSessionId = localStorage.getItem("exam_session_id");
      const savedToken = localStorage.getItem("exam_token");
      if (!savedSessionId || !savedToken) return;
      const resumed = await resumeExam(savedSessionId, savedToken);
      if (isError(resumed)) {
        if (resumed.error === "network" || resumed.error === "rpc_error") setError(resumed.message);
        else clearAttemptStorage();
        return;
      }
      if (resumed.finished) { storeFinished(resumed); router.push("/result"); return; }
      const attempt: AttemptPayload = resumed;
      setQuestions(attempt.questions); setAnswers(attempt.answers); setCurrentIndex(0); setFlagged({});
      setSessionId(attempt.session_id); setSessionToken(attempt.token);
      setElectiveSubject(attempt.elective as ElectiveSubject);
      setExamDuration(attempt.duration_seconds); setTimeLeft(attempt.time_left_seconds);
      tabSwitchCountRef.current = attempt.tab_switch_count;
      localStorage.setItem("exam_session_id", attempt.session_id); localStorage.setItem("exam_token", attempt.token);
      setStarted(true);
    }
    void loadPageData();
  }, [router]);

  function clearAttemptStorage() {
    ["examQuestions", "exam_answers", "exam_flagged", "exam_current_index", "exam_time_left", "exam_session_id", "exam_token", "exam_tab_switch_count"].forEach((key) => localStorage.removeItem(key));
  }

  function storeFinished(res: FinishedPayload) {
    // Answer keys are stripped from client storage to prevent inspection.
    localStorage.removeItem("exam_result");
    localStorage.setItem("exam_summary", JSON.stringify({
      result_id: res.result_id, score: res.score, total: res.total,
      subject_scores: res.subject_scores, show_results: res.show_results, status: res.status,
    }));
    clearAttemptStorage();
  }

  useEffect(() => {
    if (!started || questions.length === 0) return;
    localStorage.setItem("exam_answers", JSON.stringify(answers));
  }, [answers, started, questions.length]);

  useEffect(() => {
    if (!started || questions.length === 0) return;
    localStorage.setItem("exam_flagged", JSON.stringify(flagged));
  }, [flagged, started, questions.length]);

  useEffect(() => {
    if (!started || questions.length === 0) return;
    localStorage.setItem("exam_current_index", String(currentIndex));
  }, [currentIndex, started, questions.length]);

  useEffect(() => {
    if (!started || questions.length === 0) return;
    localStorage.setItem("exam_time_left", String(timeLeft));
  }, [timeLeft, started, questions.length]);

  useEffect(() => {
    localStorage.setItem(
      "exam_tab_switch_count",
      String(tabSwitchCountRef.current)
    );
  }, [awayWarning]);

  useEffect(() => {
    if (!started || questions.length === 0) return;

    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started, questions.length, timeLeft]);

    useEffect(() => {
    if (!started || !sessionId || !sessionToken) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }
    setSyncStatus("syncing");
    const timeout = setTimeout(async () => {
      const saved = await saveProgress(sessionId, sessionToken, answers);
      if (isError(saved)) {
        if (saved.error === "time_up") void handleSubmit(true);
        else if (saved.error === "network") setSyncStatus("offline");
        return;
      }
      setSyncStatus("synced");
      setTimeLeft((prev) => (Math.abs(prev - saved.time_left_seconds) > 3 ? saved.time_left_seconds : prev));
    }, 3000);
    return () => clearTimeout(timeout);
  }, [answers, started, sessionId, sessionToken]);

  useEffect(() => {
    if (!started) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        setAwayWarning(true);
        tabSwitchCountRef.current += 1;
        localStorage.setItem(
          "exam_tab_switch_count",
          String(tabSwitchCountRef.current)
        );

        if (sessionId && sessionToken) {
          const recorded = await recordTabSwitch(sessionId, sessionToken);
          if (!isError(recorded)) {
            tabSwitchCountRef.current = recorded.tab_switch_count;
            setTimeLeft(recorded.time_left_seconds);
          }
        }

        timeoutId = setTimeout(() => {
          handleSubmit(true);
        }, 10000);
      } else {
        setAwayWarning(false);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [started, sessionId, sessionToken]);

  useEffect(() => {
    if (!started) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT"
      ) {
        return;
      }

      const key = event.key.toUpperCase();

      if (["A", "B", "C", "D"].includes(key)) {
        handleSelectAnswer(key as "A" | "B" | "C" | "D");
      } else if (key === "N") {
        handleNext();
      } else if (key === "P") {
        handlePrevious();
      } else if (key === "F") {
        toggleFlag();
      } else if (key === "S") {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, currentIndex, questions, answers, flagged]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const subjectOrder = useMemo(() => {
    const seen: string[] = [];
    questions.forEach((q) => {
      if (!seen.includes(q.subject)) seen.push(q.subject);
    });
    return seen;
  }, [questions]);

  const currentSubject = currentQuestion?.subject || "";

  const firstQuestionIndexBySubject = useMemo(() => {
    const map: Record<string, number> = {};
    questions.forEach((q, index) => {
      if (map[q.subject] === undefined) {
        map[q.subject] = index;
      }
    });
    return map;
  }, [questions]);

  const currentSubjectQuestions = useMemo<QuestionWithIndex[]>(() => {
    return questions
      .map((q, index) => ({ ...q, originalIndex: index }))
      .filter((q) => q.subject === currentSubject);
  }, [questions, currentSubject]);

  const handleStartExam = async () => {
    const finalElective = electiveSubject || (candidate?.subject === "Biology" || candidate?.subject === "Mathematics" ? candidate.subject : "");
    if (!finalElective) { setError("Please select Biology or Mathematics before starting the exam."); return; }
    if (!mockEnabled) { setError("This exam is currently unavailable."); return; }
    try {
      setLoading(true); setError("");
      const code = candidate?.code || localStorage.getItem("access_code") || "";
      const res = await startExam(code, candidate?.name || "", candidate?.phone || "", finalElective);
      if (isError(res)) { setError(res.message); return; }
      clearAttemptStorage(); localStorage.removeItem("exam_result"); localStorage.removeItem("exam_summary"); localStorage.removeItem("latest_result_id");
      setQuestions(res.questions); setCurrentIndex(0); setAnswers(res.answers); setFlagged({});
      setSessionId(res.session_id); setSessionToken(res.token); setExamDuration(res.duration_seconds); setTimeLeft(res.time_left_seconds);
      setElectiveSubject(res.elective as ElectiveSubject); tabSwitchCountRef.current = res.tab_switch_count;
      localStorage.setItem("exam_session_id", res.session_id); localStorage.setItem("exam_token", res.token); localStorage.setItem("selectedElective", res.elective);
      setStarted(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to start the exam."); }
    finally { setLoading(false); }
  };

  const handleSelectAnswer = (value: "A" | "B" | "C" | "D") => {
    if (!currentQuestion) return;

    setAnswers((prev) => ({
      ...prev,
      [String(currentQuestion.id)]: value,
    }));
  };

  const toggleFlag = () => {
    if (!currentQuestion) return;

    setFlagged((prev) => ({
      ...prev,
      [String(currentQuestion.id)]: !prev[String(currentQuestion.id)],
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentIndex(index);
  };

  const goToSubject = (subject: string) => {
    const index = firstQuestionIndexBySubject[subject];
    if (index !== undefined) {
      setCurrentIndex(index);
    }
  };

  const handleSubmit = async (autoSubmitted = false) => {
    if (questions.length === 0 || submitLockRef.current) return;
    if (!autoSubmitted && !window.confirm("Are you sure you want to submit?")) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { setError("You are currently offline. Your answers are safely stored on this device. Reconnect to the internet and click Submit Exam to record your score."); return; }
    if (!sessionId || !sessionToken) { setError("No active server exam session was found. Please refresh and try again."); return; }
    submitLockRef.current = true; setLoading(true); setError("");
    const res = await submitExam(sessionId, sessionToken, answers, autoSubmitted, flagged);
    if (isError(res)) {
      submitLockRef.current = false; setLoading(false);
      setError(res.message || "Your exam could not be submitted. Please try again."); return;
    }
    storeFinished(res);
    if (autoSubmitted) alert("Your exam has been submitted automatically.");
    router.push("/result");
  };

  if (!candidate) {
    return (
      <main className="exam-shell px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="exam-card p-8">
            <p className="text-lg text-gray-700">Loading exam...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!mockEnabled) {
    return (
      <main className="exam-shell px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="exam-card p-8">
            <h1 className="text-2xl font-bold text-gray-800">
              Exam Currently Unavailable
            </h1>
            <p className="mt-3 text-gray-600">
              This exam is currently closed by the administrator.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const shouldChooseElective =
    candidate.subject !== "Biology" && candidate.subject !== "Mathematics";

  if (!started) {
    return (
      <main className="exam-shell px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="exam-card p-8">
            <h1 className="mb-3 text-2xl font-bold text-gray-800">
              CBT Exam Setup
            </h1>
            <p className="mb-3 text-gray-600">
              Candidate: <span className="font-medium">{candidate.name}</span>
            </p>
            <p className="mb-6 text-gray-600">
              {shouldChooseElective
                ? "Choose your elective subject before starting the examination."
                : `Elective subject already selected: ${candidate.subject}`}
            </p>

            {shouldChooseElective && (
              <div className="mb-6 space-y-3">
                <label className="exam-option flex items-center gap-3">
                  <input
                    type="radio"
                    name="elective"
                    value="Biology"
                    checked={electiveSubject === "Biology"}
                    onChange={() => setElectiveSubject("Biology")}
                  />
                  <span className="font-medium">Biology</span>
                </label>

                <label className="exam-option flex items-center gap-3">
                  <input
                    type="radio"
                    name="elective"
                    value="Mathematics"
                    checked={electiveSubject === "Mathematics"}
                    onChange={() => setElectiveSubject("Mathematics")}
                  />
                  <span className="font-medium">Mathematics</span>
                </label>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-6">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 mb-3">Examination Structure</h2>
              <div className="grid grid-cols-2 gap-2.5 text-sm text-slate-700 mb-4">
                <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-sm">
                  <span className="font-bold block text-slate-900">English</span>
                  <span className="text-xs text-slate-500">60 Questions</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-sm">
                  <span className="font-bold block text-slate-900">Chemistry</span>
                  <span className="text-xs text-slate-500">40 Questions</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-sm">
                  <span className="font-bold block text-slate-900">Physics</span>
                  <span className="text-xs text-slate-500">40 Questions</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 shadow-sm">
                  <span className="font-bold block text-slate-900">{shouldChooseElective ? (electiveSubject || "Elective Subject") : candidate.subject}</span>
                  <span className="text-xs text-slate-500">40 Questions</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-xs font-bold text-slate-700">
                <span>Total: 180 Questions · 400 Marks</span>
                <span>Time Allowed: {formatTime(examDuration)}</span>
              </div>
            </div>

            <button
              onClick={handleStartExam}
              disabled={loading}
              className="exam-submit-btn w-full"
            >
              {loading ? "Loading Questions..." : "Start Exam"}
            </button>

            {error && <p className="mt-4 text-red-600">{error}</p>}
          </div>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="exam-shell px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="exam-card p-8">
            <p className="text-lg text-gray-700">No question loaded.</p>
          </div>
        </div>
      </main>
    );
  }

  const selectedAnswer = answers[String(currentQuestion.id)];
  const optionA = getOptionValue(currentQuestion.option_a);
  const optionB = getOptionValue(currentQuestion.option_b);
  const optionC = getOptionValue(currentQuestion.option_c);
  const optionD = getOptionValue(currentQuestion.option_d);
  const currentIsFlagged = Boolean(flagged[String(currentQuestion.id)]);

  return (
    <main className="exam-shell">
      <div className="exam-topbar">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Brainlab CBT Exam
            </h1>
                        <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-gray-600">
                Candidate: {candidate.name} | Elective:{" "}
                {electiveSubject || candidate.subject} | Answered: {answeredCount} /{" "}
                {totalQuestions}
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  syncStatus === "offline"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : syncStatus === "syncing"
                    ? "bg-sky-100 text-sky-800 border border-sky-300 animate-pulse"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {syncStatus === "offline"
                  ? "⚡ Offline (Answers saved on device)"
                  : syncStatus === "syncing"
                  ? "↻ Syncing answers..."
                  : "✓ Answers Synced"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="exam-timer px-4 py-2">
              <p className="text-xs uppercase tracking-wide opacity-90">
                Time Left
              </p>
              <p className="text-xl font-bold">{formatTime(timeLeft)}</p>
            </div>

            {calculatorEnabled && (
              <button
                onClick={() => setShowCalculator((prev) => !prev)}
                className="exam-calc-btn"
              >
                Calculator
              </button>
            )}

            <button onClick={() => handleSubmit()} className="exam-submit-btn">
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      {awayWarning && (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div className="exam-warning p-4 text-sm">
            Warning: You left the exam page. Return within 10 seconds or your
            exam will be submitted automatically.
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl p-4">
        <div className="exam-card mb-6 p-4">
          <h2 className="mb-3 font-bold text-gray-800">Subjects</h2>
          <div className="flex flex-wrap gap-3">
            {subjectOrder.map((subject) => (
              <button
                key={subject}
                onClick={() => goToSubject(subject)}
                className={`rounded-xl px-4 py-2 font-semibold transition ${
                  currentSubject === subject
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="exam-card p-6">
            <div className="mb-4">
              <p className="mb-1 text-sm text-gray-500">
                Question {currentIndex + 1} of {totalQuestions}
              </p>
              <p className="exam-question-meta">
                {currentQuestion.subject} • {currentQuestion.section}
                {currentQuestion.category ? ` • ${currentQuestion.category}` : ""}
              </p>
            </div>

            {currentQuestion.section === "comprehension" &&
              currentQuestion.passage_text && (
                <div className="exam-passage mb-6">
                  {currentQuestion.passage_title && (
                    <h2 className="exam-passage-title">
                      {currentQuestion.passage_title}
                    </h2>
                  )}
                  <p className="exam-passage-text">{currentQuestion.passage_text}</p>
                </div>
              )}

            <div className="exam-soft-card mb-6 p-5">
              <p className="exam-question-text">
                {currentIndex + 1}. {cleanQuestionText(currentQuestion.question)}
              </p>
              {safeImageUrl(currentQuestion.question_image_url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={safeImageUrl(currentQuestion.question_image_url)!}
                  alt={currentQuestion.question_image_alt?.trim() || "Question illustration"}
                  loading="lazy"
                  className="mt-4 block max-h-96 w-auto max-w-full rounded-lg border border-gray-200 object-contain"
                />
              )}
            </div>

            <div className="space-y-3">
              {[
                { key: "A" as const, value: optionA, imageUrl: currentQuestion.option_a_image_url, imageAlt: currentQuestion.option_a_image_alt },
                { key: "B" as const, value: optionB, imageUrl: currentQuestion.option_b_image_url, imageAlt: currentQuestion.option_b_image_alt },
                { key: "C" as const, value: optionC, imageUrl: currentQuestion.option_c_image_url, imageAlt: currentQuestion.option_c_image_alt },
                { key: "D" as const, value: optionD, imageUrl: currentQuestion.option_d_image_url, imageAlt: currentQuestion.option_d_image_alt },
              ].map((option) => (
                <label
                  key={option.key}
                  className={`exam-option block ${
                    selectedAnswer === option.key ? "selected" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      checked={selectedAnswer === option.key}
                      onChange={() => handleSelectAnswer(option.key)}
                      className="mt-1"
                    />
                    <div>
                      <span className="exam-option-letter">{option.key}.</span>
                      <span>{option.value}</span>
                      {safeImageUrl(option.imageUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={safeImageUrl(option.imageUrl)!}
                          alt={option.imageAlt?.trim() || `Option ${option.key} illustration`}
                          loading="lazy"
                          className="mt-2 block max-h-64 w-auto max-w-full rounded-lg object-contain"
                        />
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="exam-nav-btn border border-gray-300 bg-white text-gray-700"
              >
                Previous
              </button>

              <button
                onClick={toggleFlag}
                className={`exam-nav-btn ${
                  currentIsFlagged
                    ? "bg-yellow-400 text-gray-900"
                    : "border border-yellow-300 bg-yellow-50 text-yellow-800"
                }`}
              >
                {currentIsFlagged ? "Unflag" : "Flag"}
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === totalQuestions - 1}
                className="exam-nav-btn bg-blue-600 text-white"
              >
                Next
              </button>
            </div>
          </div>

          <div className="exam-card h-fit p-4 lg:sticky lg:top-24">
            <h2 className="mb-1 font-bold text-gray-800">Question Palette</h2>
            <p className="mb-3 text-sm text-gray-500">{currentSubject}</p>

            <div className="grid grid-cols-5 gap-2">
              {currentSubjectQuestions.map((question) => {
                const answered = Boolean(answers[String(question.id)]);
                const active = question.originalIndex === currentIndex;
                const isFlagged = Boolean(flagged[String(question.id)]);

                return (
                  <button
                    key={question.id}
                    onClick={() => goToQuestion(question.originalIndex)}
                    className={`exam-palette-btn ${
                      active
                        ? "current"
                        : isFlagged
                        ? "flagged"
                        : answered
                        ? "answered"
                        : "unanswered"
                    }`}
                  >
                    {question.originalIndex + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>
                <span className="exam-legend-dot bg-blue-600" />
                Current
              </p>
              <p>
                <span className="exam-legend-dot bg-yellow-300" />
                Flagged
              </p>
              <p>
                <span className="exam-legend-dot bg-green-300" />
                Answered
              </p>
              <p>
                <span className="exam-legend-dot bg-gray-300" />
                Unanswered
              </p>
            </div>
          </div>
        </div>
      </div>

      {calculatorEnabled && (
        <FloatingCalculator
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
        />
      )}
    </main>
  );
}