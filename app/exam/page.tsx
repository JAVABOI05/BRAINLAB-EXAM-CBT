"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getPublicSettings, isError, recordTabSwitch, resumeExam, saveProgress, startExam, submitExam, type AttemptPayload, type FinishedPayload, type Option, type PaperQuestion } from "../lib/examApi";
import { queueExamSubmission, queueProgress } from "../lib/offlineSync";
import FloatingCalculator from "../components/FloatingCalculator";
import { useLearnerTheme } from "../components/LearnerThemeProvider";
import { cleanQuestionText } from "../lib/cleanText";
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
  user_id?: string | null;
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

function highlightPassageText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-300 dark:bg-amber-400 text-slate-950 font-bold px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function Jamb8KeypadConsole({
  selectedAnswer,
  onSelectOption,
  onPrevious,
  onNext,
  onClear,
  onSubmit,
  canPrevious,
  canNext,
  hasSelectedAnswer,
  onToggleCalculator,
  showCalculator,
  hasOptionE,
}: {
  selectedAnswer?: Option;
  onSelectOption: (option: Option) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClear: () => void;
  onSubmit: () => void;
  canPrevious: boolean;
  canNext: boolean;
  hasSelectedAnswer: boolean;
  onToggleCalculator: () => void;
  showCalculator: boolean;
  hasOptionE?: boolean;
}) {
  const optionKeys = hasOptionE ? (["A", "B", "C", "D", "E"] as const) : (["A", "B", "C", "D"] as const);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 p-3 sm:p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            JAMB 8-Keypad Hardware Terminal
          </span>
          <span className="hidden sm:inline-flex rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
            Active Emulation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCalculator}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition active:scale-95 border ${
              showCalculator
                ? "bg-sky-600 text-white border-sky-500 shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
            title="Press [C] or click to toggle on-screen calculator"
          >
            <span className="font-mono font-black text-[10px] text-sky-600 dark:text-sky-400">[C]</span>
            <span>Calc</span>
          </button>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden md:inline">
            Physical Keys: <kbd className="font-mono font-bold text-slate-700 dark:text-slate-300">A-D</kbd>, <kbd className="font-mono font-bold text-slate-700 dark:text-slate-300">P</kbd>, <kbd className="font-mono font-bold text-slate-700 dark:text-slate-300">N</kbd>, <kbd className="font-mono font-bold text-slate-700 dark:text-slate-300">R</kbd>, <kbd className="font-mono font-bold text-slate-700 dark:text-slate-300">S</kbd>
          </span>
        </div>
      </div>

      <div className={`grid gap-2 ${hasOptionE ? "grid-cols-5 sm:grid-cols-9" : "grid-cols-4 sm:grid-cols-8"}`}>
        {optionKeys.map((key) => {
          const isSelected = selectedAnswer === key;
          return (
            <button
              key={`hardware-key-${key}`}
              type="button"
              onClick={() => onSelectOption(key)}
              className={`flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 transition-all active:scale-95 border border-b-2 sm:border-b-4 ${
                isSelected
                  ? "bg-[#012153] dark:bg-blue-600 text-white border-blue-800 dark:border-blue-400 shadow-md ring-2 ring-blue-400/40"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-xs"
              }`}
              title={`Press [${key}] on physical keyboard to select Option ${key}`}
            >
              <span className="font-mono text-base sm:text-lg font-black leading-none">[{key}]</span>
              <span className={`text-[9px] font-extrabold mt-1 uppercase tracking-wider ${isSelected ? "text-blue-200" : "text-slate-400 dark:text-slate-500"}`}>
                {isSelected ? "Selected" : "Option"}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious}
          className="flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 border-b-2 sm:border-b-4 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-xs"
          title="Press [P] or Left Arrow for Previous question"
        >
          <span className="font-mono text-base sm:text-lg font-black leading-none text-slate-700 dark:text-slate-300">[P]</span>
          <span className="text-[9px] font-extrabold mt-1 uppercase tracking-wider text-slate-500 dark:text-slate-400">Prev</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 border-b-2 sm:border-b-4 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shadow-xs"
          title="Press [N] or Right Arrow for Next question"
        >
          <span className="font-mono text-base sm:text-lg font-black leading-none text-slate-700 dark:text-slate-300">[N]</span>
          <span className="text-[9px] font-extrabold mt-1 uppercase tracking-wider text-slate-500 dark:text-slate-400">Next</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={!hasSelectedAnswer}
          className={`flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 border border-b-2 sm:border-b-4 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-xs ${
            hasSelectedAnswer
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/60"
              : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700"
          }`}
          title="Press [R] to Reverse (Clear current selection)"
        >
          <span className="font-mono text-base sm:text-lg font-black leading-none">[R]</span>
          <span className="text-[9px] font-extrabold mt-1 uppercase tracking-wider">Reverse</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          className="flex flex-col items-center justify-center rounded-xl p-2 sm:p-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-600 border-b-2 sm:border-b-4 font-black shadow-xs active:scale-95 transition-all"
          title="Press [S] to Submit Examination"
        >
          <span className="font-mono text-base sm:text-lg font-black leading-none">[S]</span>
          <span className="text-[9px] font-extrabold mt-1 uppercase tracking-wider">Submit</span>
        </button>
      </div>
    </div>
  );
}

export default function ExamPage() {
  const router = useRouter();
  const { resolvedTheme, setAppearance } = useLearnerTheme();
  const toggleTheme = () => setAppearance(resolvedTheme === "dark" ? "light" : "dark");

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
  const [showMarksInExam, setShowMarksInExam] = useState(true);
  const [showTopicInExam, setShowTopicInExam] = useState(true);
  const [passageFontSize, setPassageFontSize] = useState<number>(15);
  const [passageSearchQuery, setPassageSearchQuery] = useState<string>("");
  const [mobilePassageOpen, setMobilePassageOpen] = useState<boolean>(false);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState<boolean>(false);
  const [submittedLockNotice, setSubmittedLockNotice] = useState<{
    isSubmitted: boolean;
    message: string;
    resultId?: string;
  } | null>(null);


  // Track network connectivity and auto-retry sync when online
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus("syncing");
      setError("");
      if (sessionId && sessionToken) {
        void saveProgress(sessionId, sessionToken, answers).then((saved) => {
          if (!isError(saved)) {
            setSyncStatus("synced");
            setError("");
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
      const settings = await getPublicSettings(true);
      if (!settings) { setError("Could not load exam settings. Check your connection and refresh the page."); return; }
      const duration = settings.exam_duration > 0 ? settings.exam_duration : DEFAULT_EXAM_DURATION;
      setExamDuration(duration); setTimeLeft(duration);
      setCalculatorEnabled(true); setMockEnabled(settings.mock_enabled);
      setShowMarksInExam(settings.show_marks_in_exam !== false);
      setShowTopicInExam(settings.show_topic_in_exam !== false);
      if (!settings.mock_enabled) { router.push("/access"); return; }
      const hasCandidateAccess = Boolean(parsedCandidate.code || (parsedCandidate.user_id && parsedCandidate.user_id.length > 5));
      if (settings.access_code_required && !localStorage.getItem("access_code") && !hasCandidateAccess) { router.push("/access"); return; }

      // Check if candidate arrived from /instructions with start=true
      const isStartParam = typeof window !== "undefined" && window.location.search.includes("start=true");

      const savedSessionId = localStorage.getItem("exam_session_id");
      const savedToken = localStorage.getItem("exam_token");
      const lastSubmittedId = localStorage.getItem("last_submitted_session_id");

      // Verify server-side submission status if there's a recent session
      const probeSessionId = savedSessionId || lastSubmittedId;
      if (probeSessionId) {
        try {
          const statusRes = await fetch(`/api/exam/status?sessionId=${encodeURIComponent(probeSessionId)}`).then((r) => r.json());
          if (statusRes.ok && statusRes.isSubmitted) {
            setSubmittedLockNotice({
              isSubmitted: true,
              message: "Your examination has been successfully submitted. You cannot access or modify this examination again.",
              resultId: statusRes.resultId,
            });
            return;
          }
        } catch {
          if (localStorage.getItem("brainlab_submitted_" + probeSessionId)) {
            setSubmittedLockNotice({
              isSubmitted: true,
              message: "Your examination has been successfully submitted. You cannot access or modify this examination again.",
            });
            return;
          }
        }
      }

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
        } else if ((resumed as AttemptPayload).questions && (resumed as AttemptPayload).questions.length < 180) {
          // Incomplete legacy attempt (e.g. 140 questions): purge to ensure full 180 UTME mock
          clearAttemptStorage();
          setError("A previous incomplete session was cleared. Starting your official 180-question UTME mock paper.");
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

  // Trap back navigation when an exam has been submitted
  useEffect(() => {
    const handlePopState = () => {
      const lastId = localStorage.getItem("last_submitted_session_id");
      if (lastId && localStorage.getItem("brainlab_submitted_" + lastId)) {
        if (typeof window !== "undefined") {
          window.history.pushState(null, "", "/exam");
        }
        setSubmittedLockNotice({
          isSubmitted: true,
          message: "Your examination has been successfully submitted. You cannot access or modify this examination again.",
        });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function clearAttemptStorage() {
    securePurgeExamSession();
    ["examQuestions", "exam_answers", "exam_flagged", "exam_current_index", "exam_time_left", "exam_session_id", "exam_token", "exam_tab_switch_count"].forEach((key) => localStorage.removeItem(key));
  }

  function storeFinished(res: FinishedPayload) {
    const finishedId = res.result_id || sessionId || "";
    if (finishedId) {
      localStorage.setItem("last_submitted_session_id", finishedId);
      localStorage.setItem("brainlab_submitted_" + finishedId, "true");
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/exam");
    }
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
            setError("");
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
      } else if (key === "N" || event.key === "ArrowRight") {
        handleNext();
      } else if (key === "P" || event.key === "ArrowLeft") {
        handlePrevious();
      } else if (key === "R") {
        handleClearAnswer();
      } else if (key === "F") {
        toggleFlag();
      } else if (key === "S") {
        handleSubmit();
      } else if (key === "C") {
        setShowCalculator((prev) => !prev);
      } else if (key === "Q") {
        setMobilePaletteOpen((prev) => !prev);
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

  const currentPassageCluster = useMemo(() => {
    if (!currentQuestion?.passage_text) return [];
    return currentSubjectQuestions.filter(
      (q) =>
        (q.passage_id && q.passage_id === currentQuestion.passage_id) ||
        (q.passage_title && q.passage_title === currentQuestion.passage_title) ||
        (q.passage_text && q.passage_text === currentQuestion.passage_text)
    );
  }, [currentSubjectQuestions, currentQuestion]);

  const passageQuestionNumber = useMemo(() => {
    if (currentPassageCluster.length === 0) return 0;
    const idx = currentPassageCluster.findIndex((q) => q.id === currentQuestion?.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [currentPassageCluster, currentQuestion]);

  const handleStartExam = async (overrideCandidate?: Candidate) => {
    const activeCand = overrideCandidate || candidate;
    if (!activeCand) return;

    let subjects = activeCand.subjects || [];
    if (!subjects.length || subjects.length < 4) {
      if (activeCand.subject?.toLowerCase() === "biology") {
        subjects = ["English", "Biology", "Physics", "Chemistry"];
      } else if (activeCand.subject && activeCand.subject.toLowerCase() !== "english") {
        subjects = ["English", "Mathematics", "Physics", activeCand.subject];
      } else {
        subjects = ["English", "Mathematics", "Physics", "Chemistry"];
      }
    }
    const finalElective = subjects.find((s) => !s.toLowerCase().includes("english")) || "Mathematics";

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
          setError("");
        } else {
          setSyncStatus("error");
          setError(saved.message || "Your answer could not be confirmed by the server. You can continue manually and retry saving.");
        }
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

  const handleClearAnswer = () => {
    if (!currentQuestion) return;
    const qId = String(currentQuestion.id);
    if (!answers[qId]) return;

    const nextAnswers = { ...answers };
    delete nextAnswers[qId];

    setAnswers(nextAnswers);
    try {
      localStorage.setItem("exam_answers", JSON.stringify(nextAnswers));
    } catch {
      // Local storage fallback
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
          setError("");
        } else {
          setSyncStatus("error");
          setError(saved.message || "Failed to update answer on server.");
        }
        return;
      }

      setSyncStatus("synced");
      setError("");
      if (typeof saved.time_left_seconds === "number" && Number.isFinite(saved.time_left_seconds)) {
        setTimeLeft((prev) => (
          Math.abs(prev - saved.time_left_seconds) > 3 ? saved.time_left_seconds : prev
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
    setShowSubmitModal(false);
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

  if (submittedLockNotice) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#000814] flex items-center justify-center px-4 py-8">
        <div className="mx-auto max-w-lg w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Examination Submitted
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400 font-medium">
            {submittedLockNotice.message}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => router.push("/result")}
              className="inline-flex items-center justify-center rounded-xl bg-[#012153] hover:bg-[#071c43] px-5 py-3 font-bold text-white shadow transition hover:-translate-y-0.5 active:scale-95 text-xs"
            >
              View Examination Result →
            </button>
            <button
              type="button"
              onClick={() => router.push("/corrections")}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-xs"
            >
              Review Corrections
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-3 font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-xs"
            >
              Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

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
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={120} height={102} className="h-11 w-auto dark:hidden" />
                <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={120} height={102} className="h-11 w-auto hidden dark:block" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
                  title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
                  aria-label="Toggle Theme"
                >
                  {resolvedTheme === "dark" ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                  <span>{resolvedTheme === "dark" ? "Light" : "Dark"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCalculator((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-full border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-3 py-1.5 text-xs font-bold text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition active:scale-95"
                  title="Test On-Screen Calculator"
                  aria-label="Test Calculator"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>
                  <span>Calculator</span>
                </button>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-3 py-1.5 text-xs font-black text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                  Official Examination
                </span>
              </div>
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
                          {isEng ? "60 Questions" : "40 Questions"}
                          {showMarksInExam ? " (100 Marks)" : ""}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 font-mono">Slot {idx + 1}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 dark:border-slate-800 pt-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Total: 180 Questions{showMarksInExam ? " · 400 Marks" : ""}</span>
                <span>Time Allowed: {formatTime(examDuration)}</span>
              </div>
            </div>

            <button
              onClick={() => handleStartExam()}
              disabled={loading}
              className="w-full rounded-2xl bg-[#012153] hover:bg-[#071c43] px-6 py-4 text-base font-black text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:transform-none"
            >
              {loading ? "Initializing Examination Paper..." : (
              <span className="flex items-center gap-2">
                <span>Launch CBT Exam Now</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            )}
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
          <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg><span>{resumedNotice}</span></span>
          <button
            type="button"
            onClick={() => setResumedNotice(null)}
            className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded text-emerald-200 hover:bg-emerald-800 hover:text-white"
            aria-label="Dismiss notice"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}
      <div className="exam-topbar">
        <div className="mx-auto flex max-w-none w-full flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <Image src="/brainlab-logo.png" alt="BrainLab Academy" width={100} height={85} priority className="h-9 w-auto dark:hidden" />
                <Image src="/brainlab-logo-light.png" alt="BrainLab Academy" width={100} height={85} priority className="h-9 w-auto hidden dark:block" />
              </div>
              <div className="h-8 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block" />
              <h1 className="text-lg font-black text-slate-950 dark:text-white tracking-tight">
                Brainlab CBT Exam
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium">
                Candidate: <span className="font-extrabold text-slate-950 dark:text-white">{candidate.name}</span> | Elective:{" "}
                <span className="font-bold text-slate-900 dark:text-slate-100">{electiveSubject || candidate.subject}</span> | Answered: <span className="font-black text-blue-700 dark:text-cyan-400">{answeredCount}</span> /{" "}
                {totalQuestions}
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  syncStatus === "offline"
                    ? "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700"
                    : syncStatus === "error"
                    ? "bg-red-100 text-red-900 border border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-700"
                    : syncStatus === "syncing"
                    ? "bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700 animate-pulse"
                    : "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700"
                }`}
              >
                {syncStatus === "offline" ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
                      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                      <line x1="12" y1="20" x2="12.01" y2="20" />
                    </svg>
                    <span>Offline (Saved locally)</span>
                  </>
                ) : syncStatus === "error" ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>Save needs attention</span>
                  </>
                ) : syncStatus === "syncing" ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Saving answer...</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Synced</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="exam-timer px-4 py-2">
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                Time Left
              </p>
              <p className="text-xl font-black font-mono tracking-tight">{formatTime(timeLeft)}</p>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 shadow-xs"
              title={`Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              {resolvedTheme === "dark" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
              <span className="hidden sm:inline">{resolvedTheme === "dark" ? "Light" : "Dark"}</span>
            </button>

            {/* Always Available Calculator Button */}
            <button
              type="button"
              onClick={() => setShowCalculator((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-xs border ${
                showCalculator
                  ? "bg-sky-600 text-white border-sky-500 ring-2 ring-sky-300/40"
                  : "bg-slate-900 text-white border-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 hover:bg-slate-800"
              }`}
              title="Toggle On-Screen Calculator (Shortcut: C)"
              aria-label="Toggle Calculator"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>
              <span>{showCalculator ? "Hide Calc" : "Calculator"}</span>
            </button>

            <button onClick={() => handleSubmit()} className="exam-submit-btn hover:opacity-95 active:scale-95 transition-all">
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      {awayWarning && (
        <div className="mx-auto max-w-none w-full px-4 pt-4">
          <div className="exam-warning p-4 text-sm">
            Warning: You left the exam page. Return within 10 seconds or your
            exam will be submitted automatically.
          </div>
        </div>
      )}

      <div className="mx-auto max-w-none w-full p-4">
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
                {currentQuestion.subject}
                {showTopicInExam && (
                  <>
                    {currentQuestion.section && currentQuestion.section !== "general" ? ` • ${currentQuestion.section}` : ""}
                    {currentQuestion.topic ? ` • ${currentQuestion.topic}` : currentQuestion.category ? ` • ${currentQuestion.category}` : ""}
                  </>
                )}
                {showMarksInExam && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300">
                    {currentQuestion.marks || 1} {currentQuestion.marks === 1 ? "Mark" : "Marks"}
                  </span>
                )}
              </p>
            </div>

            {/* Mobile Passage Button (for Comprehension, Cloze & Reading Texts) */}
            {currentQuestion.passage_text && (
              <button
                type="button"
                onClick={() => setMobilePassageOpen(true)}
                className="lg:hidden w-full mb-5 flex items-center justify-between rounded-2xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 p-3.5 text-left text-xs font-bold text-sky-900 dark:text-sky-200 shadow-xs active:scale-[0.99] transition hover:bg-sky-100"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 dark:text-cyan-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /></svg></span>
                  <div>
                    <p className="font-black text-blue-900 dark:text-cyan-300 text-sm">
                      {currentQuestion.passage_title || "View Reading Passage"}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                      {currentQuestion.section === "reading_text"
                        ? "Novel: The Lekki Headmaster"
                        : currentQuestion.section === "cloze"
                        ? "Cloze Passage"
                        : "Reading Comprehension"}
                      {currentPassageCluster.length > 0 && ` • Question ${passageQuestionNumber} of ${currentPassageCluster.length}`}
                    </p>
                  </div>
                </div>
                <span className="rounded-xl bg-blue-700 hover:bg-blue-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                  Read Passage →
                </span>
              </button>
            )}

            {/* Split Screen Layout when Passage is Present */}
            {currentQuestion.passage_text ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Dedicated Passage Desk */}
                <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/40 p-5 h-[calc(100vh-250px)] max-h-[750px] overflow-hidden sticky top-24 shadow-xs">
                  {/* Passage Desk Header */}
                  <div className="border-b border-sky-200 dark:border-sky-800/80 pb-3 mb-3 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                          {currentQuestion.section === "reading_text"
                            ? "UTME Novel"
                            : currentQuestion.section === "cloze"
                            ? "Cloze Passage"
                            : "Comprehension"}
                        </span>
                        {currentPassageCluster.length > 0 && (
                          <span className="rounded-md bg-sky-200 dark:bg-sky-900 px-2 py-0.5 text-[10px] font-bold text-sky-900 dark:text-sky-200">
                            Q{passageQuestionNumber} of {currentPassageCluster.length} on this passage
                          </span>
                        )}
                      </div>

                      {/* Text Size Controls */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Zoom:</span>
                        <button
                          type="button"
                          onClick={() => setPassageFontSize((prev) => Math.max(13, prev - 1))}
                          className="h-7 w-7 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-slate-700 transition"
                          title="Decrease text size"
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassageFontSize(15)}
                          className="h-7 px-2 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-slate-700 transition"
                          title="Reset text size"
                        >
                          100%
                        </button>
                        <button
                          type="button"
                          onClick={() => setPassageFontSize((prev) => Math.min(22, prev + 1))}
                          className="h-7 w-7 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-slate-700 transition"
                          title="Increase text size"
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-2 text-base font-black text-sky-950 dark:text-sky-100 flex items-center justify-between">
                      <span>{currentQuestion.passage_title || "Reading Passage"}</span>
                      {currentQuestion.reading_text_id && (
                        <span className="text-xs font-semibold text-sky-700 dark:text-cyan-400">
                          (The Lekki Headmaster)
                        </span>
                      )}
                    </h3>

                    {/* In-Passage Search */}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search keywords inside passage…"
                        value={passageSearchQuery}
                        onChange={(e) => setPassageSearchQuery(e.target.value)}
                        className="flex-1 rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                      {passageSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPassageSearchQuery("")}
                          className="inline-flex items-center justify-center h-6 w-6 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Clear search query"
                          aria-label="Clear search query"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Passage Content */}
                  <div
                    className="flex-1 overflow-y-auto pr-3 space-y-3.5 font-serif leading-relaxed text-slate-900 dark:text-slate-100"
                    style={{ fontSize: `${passageFontSize}px` }}
                  >
                    {currentQuestion.passage_text.split("\n\n").map((para, idx) => (
                      <p key={idx} className="indent-5">
                        {highlightPassageText(para, passageSearchQuery)}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Right Column: Question & Options */}
                <div className="lg:col-span-6 xl:col-span-5 flex flex-col">
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
                          <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg><span>Click diagram to enlarge</span></span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div key={`passage-opts-group-${currentQuestion.id}`} className="space-y-3">
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
                        key={`q-${currentQuestion.id}-opt-${option.key}`}
                        htmlFor={`input-q-${currentQuestion.id}-${option.key}`}
                        className={`exam-option block cursor-pointer ${
                          selectedAnswer === option.key ? "selected" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            id={`input-q-${currentQuestion.id}-${option.key}`}
                            type="radio"
                            name={`question-${currentIndex}-${currentQuestion.id}`}
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

                  <Jamb8KeypadConsole
                    selectedAnswer={selectedAnswer}
                    onSelectOption={handleSelectAnswer}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onClear={handleClearAnswer}
                    onSubmit={() => handleSubmit()}
                    canPrevious={currentIndex > 0}
                    canNext={currentIndex < totalQuestions - 1}
                    hasSelectedAnswer={Boolean(selectedAnswer)}
                    onToggleCalculator={() => setShowCalculator((prev) => !prev)}
                    showCalculator={showCalculator}
                    hasOptionE={Boolean(optionE?.trim()) || Boolean(safeImageUrl(currentQuestion.option_e_image_url))}
                  />

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
                      <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill={currentIsFlagged ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg><span>{currentIsFlagged ? "Unflag" : "Flag"}</span></span>
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
              </div>
            ) : (
              <>
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
                        <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg><span>Click diagram to enlarge</span></span>
                      </button>
                    </div>
                  )}
                </div>

                <div key={`std-opts-group-${currentQuestion.id}`} className="space-y-3">
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
                      key={`q-${currentQuestion.id}-opt-${option.key}`}
                      htmlFor={`input-std-q-${currentQuestion.id}-${option.key}`}
                      className={`exam-option block cursor-pointer ${
                        selectedAnswer === option.key ? "selected" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          id={`input-std-q-${currentQuestion.id}-${option.key}`}
                          type="radio"
                          name={`question-radio-${currentQuestion.id}`}
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

                <Jamb8KeypadConsole
                  selectedAnswer={selectedAnswer}
                  onSelectOption={handleSelectAnswer}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onClear={handleClearAnswer}
                  onSubmit={() => handleSubmit()}
                  canPrevious={currentIndex > 0}
                  canNext={currentIndex < totalQuestions - 1}
                  hasSelectedAnswer={Boolean(selectedAnswer)}
                  onToggleCalculator={() => setShowCalculator((prev) => !prev)}
                  showCalculator={showCalculator}
                  hasOptionE={Boolean(optionE?.trim()) || Boolean(safeImageUrl(currentQuestion.option_e_image_url))}
                />

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
                    <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill={currentIsFlagged ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg><span>{currentIsFlagged ? "Unflag" : "Flag"}</span></span>
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={currentIndex === totalQuestions - 1}
                    className="exam-nav-btn bg-[#012153] hover:bg-[#071c43] text-white shadow-md shadow-blue-950/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
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

      
      {/* Full-screen Submitting Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 text-white text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/30 border border-blue-400 text-3xl animate-bounce mb-4">
            ⏳
          </div>
          <h3 className="text-xl font-black">Submitting Your Examination...</h3>
          <p className="mt-2 text-sm text-slate-300 max-w-sm">
            Please wait while BrainLab securely records your answers, grades your paper, and prepares your verified result slip.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Do not close or refresh this window</span>
          </div>
        </div>
      )}

      {/* Submission Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-cyan-300 text-2xl font-black">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" /></svg>
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
                  <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg><span>You still have <strong>{questions.length - Object.keys(answers).length} unanswered</strong></span></span> question{questions.length - Object.keys(answers).length === 1 ? "" : "s"}.
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

      {/* Floating Calculator Quick-Access Trigger Button */}
      {calculatorEnabled && (
        <button
          type="button"
          onClick={() => setShowCalculator((prev) => !prev)}
          className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-xs sm:text-sm font-bold shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
            showCalculator
              ? "bg-sky-600 text-white ring-4 ring-sky-300/40"
              : "bg-slate-900 text-white dark:bg-slate-800 dark:border dark:border-slate-700 hover:bg-slate-800"
          }`}
          title="Toggle On-Screen Calculator"
          aria-label="Toggle On-Screen Calculator"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <line x1="8" x2="16" y1="6" y2="6" />
            <line x1="16" x2="16" y1="14" y2="18" />
            <path d="M16 10h.01" />
            <path d="M12 10h.01" />
            <path d="M8 10h.01" />
            <path d="M12 14h.01" />
            <path d="M8 14h.01" />
            <path d="M12 18h.01" />
            <path d="M8 18h.01" />
          </svg>
          <span className="font-extrabold">{showCalculator ? "Hide Calc" : "Calculator"}</span>
        </button>
      )}

      {calculatorEnabled && (
        <FloatingCalculator
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* Mobile Reading Passage Drawer Modal */}
      {mobilePassageOpen && currentQuestion?.passage_text && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-fade-in lg:hidden"
          onClick={() => setMobilePassageOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] rounded-3xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 p-5 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <div>
                <span className="rounded-md bg-blue-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  {currentQuestion.section === "reading_text"
                    ? "The Lekki Headmaster"
                    : currentQuestion.section === "cloze"
                    ? "Cloze Passage"
                    : "Reading Comprehension"}
                </span>
                <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  {currentQuestion.passage_title || "Reading Passage"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobilePassageOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center font-bold"
                title="Close Reading Passage"
                aria-label="Close Reading Passage"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Font & Search Bar */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPassageFontSize((p) => Math.max(13, p - 1))}
                  className="h-7 w-7 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() => setPassageFontSize(15)}
                  className="h-7 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setPassageFontSize((p) => Math.min(22, p + 1))}
                  className="h-7 w-7 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  A+
                </button>
              </div>
              <input
                type="text"
                placeholder="Search keywords…"
                value={passageSearchQuery}
                onChange={(e) => setPassageSearchQuery(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Passage Content */}
            <div
              className="flex-1 overflow-y-auto pr-1 space-y-3 font-serif leading-relaxed text-slate-900 dark:text-slate-100"
              style={{ fontSize: `${passageFontSize}px` }}
            >
              {currentQuestion.passage_text.split("\n\n").map((para, idx) => (
                <p key={idx} className="indent-4">
                  {highlightPassageText(para, passageSearchQuery)}
                </p>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMobilePassageOpen(false)}
                className="w-full rounded-xl bg-blue-700 py-2.5 text-xs font-bold text-white shadow-md active:scale-95"
              >
                Return to Question Options →
              </button>
            </div>
          </div>
        </div>
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
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-cyan-300"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                  High-Resolution Examination Diagram
                </span>
              </div>
              <button
                type="button"
                onClick={() => setZoomImageUrl(null)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition active:scale-95"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>Close (Esc)</span>
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

      {/* Mobile Floating Question Palette Trigger */}
      {started && (
        <div className="fixed bottom-4 right-4 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePaletteOpen(true)}
            className="flex items-center gap-2 rounded-full border border-sky-400/50 bg-[#012153]/95 hover:bg-[#071c43] text-white px-4 py-3 shadow-2xl backdrop-blur-md text-xs font-bold active:scale-95 transition-all min-h-[44px] cursor-pointer"
            aria-label="Open Question Palette Matrix Drawer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Grid [{currentIndex + 1}/{totalQuestions}]</span>
          </button>
        </div>
      )}

      {/* Mobile Question Palette Drawer Modal */}
      {mobilePaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in lg:hidden"
          onClick={() => setMobilePaletteOpen(false)}
        >
          <div
            className="w-full max-w-md max-h-[85vh] rounded-3xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 p-5 shadow-2xl flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Question Palette</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {currentSubject} • {answeredCount}/{totalQuestions} Answered
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
                title="Close Question Palette"
                aria-label="Close Question Palette"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Subject Switcher */}
            {subjectOrder.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {subjectOrder.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      goToSubject(subj);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentSubject === subj
                        ? "bg-[#012153] text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            )}

            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-2 my-2">
              {currentSubjectQuestions.map((q) => {
                const answered = Boolean(answers[String(q.id)]);
                const active = q.originalIndex === currentIndex;
                const isFlagged = Boolean(flagged[String(q.id)]);

                return (
                  <button
                    key={`mobile-pal-${q.id}`}
                    type="button"
                    onClick={() => {
                      goToQuestion(q.originalIndex);
                      setMobilePaletteOpen(false);
                    }}
                    className={`exam-palette-btn active:scale-90 min-h-[44px] cursor-pointer ${
                      active
                        ? "current"
                        : isFlagged
                        ? "flagged"
                        : answered
                        ? "answered"
                        : "unanswered"
                    }`}
                  >
                    {q.originalIndex + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <p className="flex items-center gap-1.5">
                <span className="exam-legend-dot bg-[#071c43] dark:bg-sky-400" /> Current
              </p>
              <p className="flex items-center gap-1.5">
                <span className="exam-legend-dot bg-amber-400" /> Flagged
              </p>
              <p className="flex items-center gap-1.5">
                <span className="exam-legend-dot bg-emerald-500" /> Answered
              </p>
              <p className="flex items-center gap-1.5">
                <span className="exam-legend-dot bg-slate-300 dark:bg-slate-700" /> Unanswered
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}