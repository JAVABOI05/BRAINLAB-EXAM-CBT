"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getPublicSettings, isError, recordTabSwitch, resumeExam, saveProgress, startExam, submitExam, type AttemptPayload, type FinishedPayload, type Option, type PaperQuestion } from "../lib/examApi";
import { queueExamSubmission, queueProgress } from "../lib/offlineSync";
import FloatingCalculator from "../components/FloatingCalculator";
import { cleanQuestionText } from "../lib/cleanText";
import { recordLearningActivity } from "../lib/gamification";
import { securePurgeExamSession } from "../lib/clientCrypto";

type QuestionRow = PaperQuestion;

type ElectiveSubject = "Biology" | "Mathematics";
type AnswersMap = Record<string, Option>;
type FlaggedMap = Record<string, boolean>;

type Candidate = {
  name: string;
  phone: string;
  subject: string;
  subjects?: string[];
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
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [resumedNotice, setResumedNotice] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_EXAM_DURATION);
  const [examDuration, setExamDuration] = useState(DEFAULT_EXAM_DURATION);
  const [awayWarning, setAwayWarning] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorEnabled, setCalculatorEnabled] = useState(true);
  const [mockEnabled, setMockEnabled] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "error">("synced");
  const [showSubmitModal, setShowSubmitModal] = useState(false);


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
  const answerSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const answerSaveSequenceRef = useRef(0);

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

      // Check if candidate arrived from /instructions with start=true
      const isStartParam = typeof window !== "undefined" && window.location.search.includes("start=true");

      const savedSessionId = localStorage.getItem("exam_session_id");
      const savedToken = localStorage.getItem("exam_token");

      if (savedSessionId && savedToken && !isStartParam) {
        const resumed = await resumeExam(savedSessionId, savedToken);
        if (isError(resumed)) {
          clearAttemptStorage();
        } else if (resumed.finished) {
          clearAttemptStorage();
          storeFinished(resumed);
          router.push("/result");
          return;
        } else if (typeof (resumed as AttemptPayload).time_left_seconds === "number" && (resumed as AttemptPayload).time_left_seconds <= 0) {
          // Stale session that has already timed out in the past: clear it so student starts fresh
          clearAttemptStorage();
        } else {
          const attempt: AttemptPayload = resumed as AttemptPayload;
          setQuestions(attempt.questions);
          let mergedAnswers = attempt.answers || {};
          try {
            const localAns = localStorage.getItem("exam_answers");
            if (localAns) {
              const parsed = JSON.parse(localAns);
              if (parsed && typeof parsed === "object") {
                mergedAnswers = { ...mergedAnswers, ...parsed };
              }
            }
          } catch {}
          setAnswers(mergedAnswers);

          let restoredIndex = 0;
          try {
            const savedIdx = Number(localStorage.getItem("exam_current_index"));
            if (!isNaN(savedIdx) && savedIdx >= 0 && savedIdx < attempt.questions.length) {
              restoredIndex = savedIdx;
            }
          } catch {}
          setCurrentIndex(restoredIndex);

          let restoredFlagged: FlaggedMap = {};
          try {
            const savedFlagged = localStorage.getItem("exam_flagged");
            if (savedFlagged) restoredFlagged = JSON.parse(savedFlagged);
          } catch {}
          setFlagged(restoredFlagged);

          setSessionId(attempt.session_id); setSessionToken(attempt.token);
          setElectiveSubject(attempt.elective as ElectiveSubject);
          setExamDuration(attempt.duration_seconds); setTimeLeft(attempt.time_left_seconds);
          tabSwitchCountRef.current = attempt.tab_switch_count;
          localStorage.setItem("exam_session_id", attempt.session_id); localStorage.setItem("exam_token", attempt.token);
          setStarted(true);
          setResumedNotice("Active exam session recovered. Your time and saved answers have been restored.");
          return;
        }
      }

      // If user came with start=true, begin the exam immediately with their configured 4 subjects!
      if (isStartParam) {
        clearAttemptStorage();
        void handleStartExam(parsedCandidate);
      }
    }
    void loadPageData();
  }, [router]);

  function clearAttemptStorage() {
    securePurgeExamSession();
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
    if (typeof res.score === "number" && typeof res.total === "number" && res.total > 0) {
      const pct = Math.round((res.score / res.total) * 100);
      void recordLearningActivity("quiz_complete", res.result_id, pct);
    }
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
      queueProgress(sessionId, sessionToken, answers);
      return;
    }
    setSyncStatus("syncing");
    const timeout = setTimeout(() => {
      const saveTask = answerSaveQueueRef.current.then(async () => {
        const saved = await saveProgress(sessionId, sessionToken, answers);
        if (isError(saved)) {
          if (saved.error === "time_up") void handleSubmit(true);
          else if (saved.error === "network") {
            queueProgress(sessionId, sessionToken, answers);
            setSyncStatus("offline");
          } else {
            setSyncStatus("error");
            setError(saved.message || "Your answers could not be confirmed by the server.");
          }
          return;
        }
        setSyncStatus("synced");
        setError("");
        if (typeof saved.time_left_seconds === "number" && Number.isFinite(saved.time_left_seconds)) {
          setTimeLeft((prev) => (Math.abs(prev - saved.time_left_seconds) > 3 ? saved.time_left_seconds : prev));
        }
      });
      answerSaveQueueRef.current = saveTask.then(() => undefined, () => undefined);
    }, 3000);
    return () => clearTimeout(timeout);
  }, [answers, started, sessionId, sessionToken]);

  useEffect(() => {
    if (!started) return;

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
            if (typeof recorded.time_left_seconds === "number" && recorded.time_left_seconds > 0) {
              setTimeLeft(recorded.time_left_seconds);
            }
          }
        }
      } else {
        setAwayWarning(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [started, sessionId, sessionToken]);

  useEffect(() => {
    if (!started) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement | null)?.tagName;
      if (
        showSubmitModal ||
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        activeTag === "SELECT"
      ) {
        return;
      }

      const key = event.key.toUpperCase();

      if (["A", "B", "C", "D", "E"].includes(key)) {
        handleSelectAnswer(key as "A" | "B" | "C" | "D" | "E");
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
  }, [started, currentIndex, questions, answers, flagged, showSubmitModal]);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const unansweredCount = useMemo(
    () => questions.filter((question) => !answers[String(question.id)]).length,
    [questions, answers]
  );
  const firstUnansweredIndex = useMemo(
    () => questions.findIndex((question) => !answers[String(question.id)]),
    [questions, answers]
  );

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

  const handleStartExam = async (overrideCandidate?: Candidate) => {
    const activeCand = overrideCandidate || candidate;
    if (!activeCand) return;

    let subjects = activeCand.subjects || [];
    if (!subjects.length) {
      subjects = activeCand.subject ? ["English", activeCand.subject] : ["English", "Mathematics", "Physics", "Chemistry"];
    }
    const finalElective = subjects[3] || subjects[1] || "Mathematics";

    if (!mockEnabled) { setError("This exam is currently unavailable."); return; }
    try {
      setLoading(true); setError("");
      const code = activeCand.code || localStorage.getItem("access_code") || "";
      const res = await startExam(code, activeCand.name || "", activeCand.phone || "", finalElective, subjects);
      if (isError(res)) { setError(res.message); return; }
      clearAttemptStorage();
      localStorage.removeItem("exam_result"); localStorage.removeItem("exam_summary"); localStorage.removeItem("latest_result_id");
      setQuestions(res.questions); setCurrentIndex(0); setAnswers(res.answers || {}); setFlagged({});
      setSessionId(res.session_id); setSessionToken(res.token); setExamDuration(res.duration_seconds); setTimeLeft(res.time_left_seconds);
      setElectiveSubject(res.elective as ElectiveSubject); tabSwitchCountRef.current = res.tab_switch_count || 0;
      localStorage.setItem("exam_session_id", res.session_id); localStorage.setItem("exam_token", res.token); localStorage.setItem("selectedElective", res.elective);
      setStarted(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to start the exam."); }
    finally { setLoading(false); }
  };

  const handleSelectAnswer = (value: Option) => {
    if (!currentQuestion) return;

    const questionIndex = currentIndex;
    const nextAnswers = {
      ...answers,
      [String(currentQuestion.id)]: value,
    };
    const sequence = ++answerSaveSequenceRef.current;

    setAnswers(nextAnswers);
    try {
      // Persist locally before any network request so a refresh cannot drop the selection.
      localStorage.setItem("exam_answers", JSON.stringify(nextAnswers));
    } catch {
      // The server save below remains the authoritative confirmation.
    }

    if (!sessionId || !sessionToken) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueProgress(sessionId, sessionToken, nextAnswers);
      setSyncStatus("offline");
      return;
    }

    setSyncStatus("syncing");
    const saveTask = answerSaveQueueRef.current.then(async () => {
      const saved = await saveProgress(sessionId, sessionToken, nextAnswers);
      if (isError(saved)) {
        if (saved.error === "network") {
          queueProgress(sessionId, sessionToken, nextAnswers);
          setSyncStatus("offline");
        } else {
          setSyncStatus("error");
        }
        setError(saved.message || "Your answer could not be confirmed by the server. You can continue manually and retry saving.");
        return;
      }

      setSyncStatus("synced");
      setError("");
      if (typeof saved.time_left_seconds === "number" && Number.isFinite(saved.time_left_seconds)) {
        setTimeLeft((prev) => (
          Math.abs(prev - saved.time_left_seconds) > 3 ? saved.time_left_seconds : prev
        ));
      }

      // Auto-advance only after the server confirms the latest selected answer was saved.
      // If the learner has navigated elsewhere or changed the answer, do not move them.
      if (sequence === answerSaveSequenceRef.current) {
        setCurrentIndex((prev) => (
          prev === questionIndex ? Math.min(prev + 1, totalQuestions - 1) : prev
        ));
      }
    });

    answerSaveQueueRef.current = saveTask.then(() => undefined, () => undefined);
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

  const executeSubmit = async (autoSubmitted = false) => {
    if (questions.length === 0 || submitLockRef.current) return;
    if (!sessionId || !sessionToken) {
      setError("No active server exam session was found. Please refresh and try again.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueExamSubmission({
        sessionId,
        token: sessionToken,
        answers,
        autoSubmitted,
        flagged,
      });
      setError("You are currently offline. Your exam answers have been safely queued in your device's offline storage. BrainLab will submit automatically as soon as internet connectivity is restored.");
      return;
    }
    submitLockRef.current = true;
    setLoading(true);
    setError("");
    const res = await submitExam(sessionId, sessionToken, answers, autoSubmitted, flagged);
    if (isError(res)) {
      submitLockRef.current = false;
      setLoading(false);
      if (res.error === "network") {
        queueExamSubmission({
          sessionId,
          token: sessionToken,
          answers,
          autoSubmitted,
          flagged,
        });
        setError("Network connection dropped during submission. Your exam answers are safely queued in offline storage and will submit automatically once connected.");
        return;
      }
      setError(res.message || "Your exam could not be submitted. Please try again.");
      return;
    }
    storeFinished(res);
    router.push("/result");
  };

  const handleSubmit = (autoSubmitted = false) => {
    if (autoSubmitted) {
      void executeSubmit(true);
    } else {
      setShowSubmitModal(true);
    }
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

  const candidateSubjects = candidate?.subjects && candidate.subjects.length > 0
    ? candidate.subjects
    : ["English", "Mathematics", "Physics", candidate?.subject || "Chemistry"];

  if (!started) {
    return (
      <main className="exam-shell px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="exam-card p-8">
            <div className="mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={120} height={102} className="h-11 w-auto dark:hidden" />
                <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={120} height={102} className="h-11 w-auto hidden dark:block" />
              </div>
              <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-3 py-1 text-xs font-black text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                Official Examination
              </span>
            </div>
            <h1 className="mb-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Candidate CBT Setup
            </h1>
            <p className="mb-4 text-gray-600 dark:text-slate-400">
              Candidate: <span className="font-bold text-slate-900 dark:text-white">{candidate.name}</span> · <span className="font-mono">{candidate.phone}</span>
            </p>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-cyan-400">
                  Registered 4-Subject Combination
                </h2>
                <span className="text-[11px] font-bold text-slate-500">180 Questions Total</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm mb-4">
                {candidateSubjects.map((subj, idx) => {
                  const isEng = subj.toLowerCase().includes("english");
                  return (
                    <div key={idx} className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{subj}</span>
                          {isEng && (
                            <span className="text-[9px] font-black uppercase text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                              Compulsory
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {isEng ? "60 Questions (100 Marks)" : "40 Questions (100 Marks)"}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono">Slot {idx + 1}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 dark:border-slate-800 pt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Total: 180 Questions · 400 Marks</span>
                <span>Time Allowed: {formatTime(examDuration)}</span>
              </div>
            </div>

            <button
              onClick={() => handleStartExam()}
              disabled={loading}
              className="w-full rounded-2xl bg-[#012153] hover:bg-[#071c43] px-6 py-4 text-base font-black text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:transform-none"
            >
              {loading ? "Initializing Examination Paper..." : "🚀 Launch CBT Exam Now"}
            </button>

            {error && <p className="mt-4 text-red-600 font-semibold text-center">{error}</p>}
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
  const optionE = getOptionValue(currentQuestion.option_e);
  const currentIsFlagged = Boolean(flagged[String(currentQuestion.id)]);

  return (
    <main className="exam-shell">
      {resumedNotice && (
        <div className="bg-emerald-700 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-sm flex items-center justify-center gap-2">
          <span>🔄 {resumedNotice}</span>
          <button
            type="button"
            onClick={() => setResumedNotice(null)}
            className="ml-2 rounded px-1.5 py-0.5 text-emerald-200 hover:bg-emerald-800 hover:text-white"
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}
      <div className="exam-topbar">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={100} height={85} className="h-9 w-auto dark:hidden" />
                <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={100} height={85} className="h-9 w-auto hidden dark:block" />
              </div>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <h1 className="text-lg font-black text-slate-900 dark:text-white">
                Brainlab CBT Exam
              </h1>
            </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Candidate: <span className="font-bold text-slate-900 dark:text-white">{candidate.name}</span> | Elective:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{electiveSubject || candidate.subject}</span> | Answered: <span className="font-bold text-blue-700 dark:text-cyan-400">{answeredCount}</span> /{" "}
                {totalQuestions}
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  syncStatus === "offline"
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : syncStatus === "error"
                    ? "bg-red-100 text-red-800 border border-red-300"
                    : syncStatus === "syncing"
                    ? "bg-sky-100 text-sky-800 border border-sky-300 animate-pulse"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {syncStatus === "offline"
                  ? "⚡ Offline (Saved locally)"
                  : syncStatus === "error"
                  ? "⚠ Save needs attention"
                  : syncStatus === "syncing"
                  ? "↻ Saving answer..."
                  : "✓ Synced"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="exam-timer px-4 py-2">
              <p className="text-xs uppercase tracking-wide opacity-90">
                Time Left
              </p>
              <p className="text-xl font-bold font-mono">{formatTime(timeLeft)}</p>
            </div>

            {calculatorEnabled && (
              <button
                onClick={() => setShowCalculator((prev) => !prev)}
                className="exam-calc-btn hover:opacity-90 active:scale-95 transition-all"
              >
                Calculator
              </button>
            )}

            <button onClick={() => handleSubmit()} className="exam-submit-btn hover:opacity-90 active:scale-95 transition-all">
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
        <div className="exam-card mb-6 p-4 sm:p-5">
          <h2 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Examination Subjects</h2>
          <div className="flex flex-wrap gap-2.5">
            {subjectOrder.map((subject) => (
              <button
                key={subject}
                onClick={() => goToSubject(subject)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all duration-150 active:scale-95 ${
                  currentSubject === subject
                    ? "bg-[#012153] text-white shadow-md shadow-blue-950/20 ring-2 ring-[#38bdf8]/50"
                    : "border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
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
                <div className="relative mt-4 inline-block group max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={safeImageUrl(currentQuestion.question_image_url)!}
                    alt={currentQuestion.question_image_alt?.trim() || "Question illustration diagram"}
                    loading="lazy"
                    onClick={() => setZoomImageUrl(safeImageUrl(currentQuestion.question_image_url))}
                    className="block max-h-96 w-auto max-w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 object-contain shadow-sm cursor-zoom-in transition hover:opacity-95"
                  />
                  <button
                    type="button"
                    onClick={() => setZoomImageUrl(safeImageUrl(currentQuestion.question_image_url))}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-3 py-1 text-xs font-bold text-blue-700 dark:text-cyan-300 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95"
                  >
                    <span>🔍 Click diagram to enlarge</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {[
                { key: "A" as const, value: optionA, imageUrl: currentQuestion.option_a_image_url, imageAlt: currentQuestion.option_a_image_alt },
                { key: "B" as const, value: optionB, imageUrl: currentQuestion.option_b_image_url, imageAlt: currentQuestion.option_b_image_alt },
                { key: "C" as const, value: optionC, imageUrl: currentQuestion.option_c_image_url, imageAlt: currentQuestion.option_c_image_alt },
                { key: "D" as const, value: optionD, imageUrl: currentQuestion.option_d_image_url, imageAlt: currentQuestion.option_d_image_alt },
                { key: "E" as const, value: optionE, imageUrl: currentQuestion.option_e_image_url, imageAlt: currentQuestion.option_e_image_alt },
              ]
                .filter((opt) => Boolean(opt.value?.trim()) || Boolean(safeImageUrl(opt.imageUrl)))
                .map((option) => (
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

            <div className="mt-8 flex items-center justify-between gap-3 sm:gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="exam-nav-btn border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                ← Previous
              </button>

              <button
                onClick={toggleFlag}
                className={`exam-nav-btn active:scale-95 transition-all ${
                  currentIsFlagged
                    ? "bg-amber-400 text-slate-950 font-black shadow-sm"
                    : "border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                }`}
              >
                {currentIsFlagged ? "⚐ Unflag" : "⚐ Flag"}
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === totalQuestions - 1}
                className="exam-nav-btn bg-[#012153] hover:bg-[#071c43] text-white shadow-md shadow-blue-950/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="exam-card h-fit p-4 lg:sticky lg:top-24">
            <h2 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">Question Palette</h2>
            <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{currentSubject}</p>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {currentSubjectQuestions.map((question) => {
                const answered = Boolean(answers[String(question.id)]);
                const active = question.originalIndex === currentIndex;
                const isFlagged = Boolean(flagged[String(question.id)]);

                return (
                  <button
                    key={question.id}
                    onClick={() => goToQuestion(question.originalIndex)}
                    className={`exam-palette-btn active:scale-90 ${
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

            <div className="mt-5 space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
              <p className="flex items-center">
                <span className="exam-legend-dot bg-[#071c43] dark:bg-sky-400" />
                Current
              </p>
              <p className="flex items-center">
                <span className="exam-legend-dot bg-amber-400" />
                Flagged for Review
              </p>
              <p className="flex items-center">
                <span className="exam-legend-dot bg-emerald-500" />
                Answered
              </p>
              <p className="flex items-center">
                <span className="exam-legend-dot bg-slate-300 dark:bg-slate-700" />
                Unanswered
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-cyan-300 text-2xl font-black">
                📝
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Submit Your CBT Exam?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Please review your question status before finalizing.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/70 p-4 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Total Questions:</span>
                <span className="font-bold text-slate-900 dark:text-white">{questions.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Answered:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{Object.keys(answers).length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">Unanswered:</span>
                <span className={`font-bold ${questions.length - Object.keys(answers).length > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                  {Math.max(0, questions.length - Object.keys(answers).length)}
                </span>
              </div>
              {questions.length - Object.keys(answers).length > 0 && (
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 rounded-xl p-2.5 border border-amber-200 dark:border-amber-800 mt-2">
                  ⚠️ You still have <strong>{questions.length - Object.keys(answers).length} unanswered</strong> question{questions.length - Object.keys(answers).length === 1 ? "" : "s"}.
                </div>
              )}
            </div>

            {firstUnansweredIndex >= 0 && (
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(firstUnansweredIndex);
                  setShowSubmitModal(false);
                }}
                className="w-full rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 py-2.5 text-xs font-extrabold text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition active:scale-95"
              >
                Review unanswered questions ({unansweredCount})
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
              >
                Return to Exam
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setShowSubmitModal(false);
                  void executeSubmit(false);
                }}
                className="rounded-xl bg-[#012153] hover:bg-blue-900 py-2.5 text-xs font-bold text-white shadow transition active:scale-95"
              >
                {loading ? "Submitting..." : "Yes, Submit Exam"}
              </button>
            </div>
          </div>
        </div>
      )}

      {calculatorEnabled && (
        <FloatingCalculator
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
        />
      )}
    {/* High-Resolution Diagram Lightbox Modal */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative max-h-[92vh] max-w-[92vw] rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔬</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  High-Resolution Examination Diagram
                </span>
              </div>
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95"
              >
                ✕ Close (Esc)
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center overflow-auto max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomImageUrl}
                alt="Enlarged Diagram View"
                className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain mx-auto shadow-sm"
              />
            </div>
            <p className="mt-3 text-center text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Tip: Click outside or click Close to return to answering your question.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}