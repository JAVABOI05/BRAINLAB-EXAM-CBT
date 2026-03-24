"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import FloatingCalculator from "../components/FloatingCalculator";

type QuestionRow = {
  id: number;
  source_question_id: string | null;
  subject: string;
  section: string;
  category: string | null;
  passage_id: string | null;
  passage_title: string | null;
  passage_text: string | null;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_answer: string;
  explanation: string | null;
  marks: number;
  difficulty: string | null;
  is_active: boolean;
};

type ElectiveSubject = "Biology" | "Mathematics";
type AnswersMap = Record<string, "A" | "B" | "C" | "D">;
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

const EXAM_CONFIG = {
  englishObjective: 43,
  englishLiterature: 7,
  comprehensionPassages: 2,
  comprehensionQuestionsPerPassage: 5,
  chemistry: 40,
  physics: 40,
  elective: 40,
};

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom<T>(array: T[], count: number): T[] {
  return shuffleArray(array).slice(0, count);
}

function getOptionValue(value: string | null | undefined): string {
  return value?.trim() || "";
}

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => unit.toString().padStart(2, "0"))
    .join(":");
}

async function fetchQuestionsBySubjectSection(
  subject: string,
  section: string,
  count: number
): Promise<QuestionRow[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("subject", subject)
    .eq("section", section)
    .eq("is_active", true);

  if (error) {
    throw new Error(`${subject} ${section} fetch failed: ${error.message}`);
  }

  const rows = (data || []) as QuestionRow[];

  if (rows.length < count) {
    throw new Error(
      `Not enough ${subject} ${section} questions. Needed ${count}, found ${rows.length}.`
    );
  }

  return pickRandom(rows, count);
}

async function fetchEnglishComprehension(
  passageCount: number,
  questionsPerPassage: number
): Promise<QuestionRow[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("subject", "English")
    .eq("section", "comprehension")
    .eq("is_active", true)
    .not("passage_id", "is", null);

  if (error) {
    throw new Error(`English comprehension fetch failed: ${error.message}`);
  }

  const rows = (data || []) as QuestionRow[];

  const grouped = rows.reduce<Record<string, QuestionRow[]>>((acc, row) => {
    if (!row.passage_id) return acc;
    if (!acc[row.passage_id]) acc[row.passage_id] = [];
    acc[row.passage_id].push(row);
    return acc;
  }, {});

  const validPassages = Object.values(grouped).filter(
    (group) => group.length >= questionsPerPassage
  );

  if (validPassages.length < passageCount) {
    throw new Error(
      `Not enough comprehension passages. Needed ${passageCount}, found ${validPassages.length}.`
    );
  }

  const selectedPassages = pickRandom(validPassages, passageCount);

  return selectedPassages.flatMap((group) =>
    pickRandom(group, questionsPerPassage)
  );
}

async function buildExamPaper(
  electiveSubject: ElectiveSubject
): Promise<QuestionRow[]> {
  const [
    englishObjective,
    englishLiterature,
    englishComprehension,
    chemistry,
    physics,
    electiveQuestions,
  ] = await Promise.all([
    fetchQuestionsBySubjectSection(
      "English",
      "objective",
      EXAM_CONFIG.englishObjective
    ),
    fetchQuestionsBySubjectSection(
      "English",
      "literature",
      EXAM_CONFIG.englishLiterature
    ),
    fetchEnglishComprehension(
      EXAM_CONFIG.comprehensionPassages,
      EXAM_CONFIG.comprehensionQuestionsPerPassage
    ),
    fetchQuestionsBySubjectSection(
      "Chemistry",
      "objective",
      EXAM_CONFIG.chemistry
    ),
    fetchQuestionsBySubjectSection("Physics", "objective", EXAM_CONFIG.physics),
    fetchQuestionsBySubjectSection(
      electiveSubject,
      "objective",
      EXAM_CONFIG.elective
    ),
  ]);

  return [
    ...englishObjective,
    ...englishLiterature,
    ...englishComprehension,
    ...chemistry,
    ...physics,
    ...electiveQuestions,
  ];
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

  const submitLockRef = useRef(false);
  const tabSwitchCountRef = useRef(0);

  useEffect(() => {
    async function loadPageData() {
      const accessCode = localStorage.getItem("access_code");
      if (!accessCode) {
        router.push("/access");
        return;
      }

      const savedCandidate = localStorage.getItem("candidate");
      const savedQuestions = localStorage.getItem("examQuestions");
      const savedElective = localStorage.getItem("selectedElective");
      const savedAnswers = localStorage.getItem("exam_answers");
      const savedFlags = localStorage.getItem("exam_flagged");
      const savedCurrentIndex = localStorage.getItem("exam_current_index");
      const savedTimeLeft = localStorage.getItem("exam_time_left");
      const savedSessionId = localStorage.getItem("exam_session_id");
      const savedTabSwitchCount = localStorage.getItem("exam_tab_switch_count");

      if (!savedCandidate) {
        router.push("/");
        return;
      }

      try {
        const parsedCandidate = JSON.parse(savedCandidate) as Candidate;
        setCandidate(parsedCandidate);

        if (
          parsedCandidate.subject === "Biology" ||
          parsedCandidate.subject === "Mathematics"
        ) {
          setElectiveSubject(parsedCandidate.subject);
        }

        const [
          { data: durationSetting },
          { data: calculatorSetting },
          { data: mockSetting },
        ] = await Promise.all([
          supabase
            .from("settings")
            .select("value")
            .eq("key", "exam_duration")
            .single(),
          supabase
            .from("settings")
            .select("value")
            .eq("key", "calculator_enabled")
            .single(),
          supabase
            .from("settings")
            .select("value")
            .eq("key", "mock_enabled")
            .single(),
        ]);

        const durationValue = Number(durationSetting?.value);
        const finalDuration =
          Number.isFinite(durationValue) && durationValue > 0
            ? durationValue
            : DEFAULT_EXAM_DURATION;

        const calcOn =
          calculatorSetting?.value === true ||
          calculatorSetting?.value === "true";

        const mockOn =
          mockSetting?.value === true || mockSetting?.value === "true";

        setExamDuration(finalDuration);
        setCalculatorEnabled(calcOn);
        setMockEnabled(mockOn);

        if (!mockOn) {
          router.push("/access");
          return;
        }

        if (savedQuestions) {
          setQuestions(JSON.parse(savedQuestions));
          setStarted(true);
        }

        if (savedElective) {
          setElectiveSubject(savedElective as ElectiveSubject);
        }

        if (savedAnswers) {
          setAnswers(JSON.parse(savedAnswers));
        }

        if (savedFlags) {
          setFlagged(JSON.parse(savedFlags));
        }

        if (savedCurrentIndex) {
          setCurrentIndex(Number(savedCurrentIndex));
        }

        if (savedTimeLeft) {
          setTimeLeft(Number(savedTimeLeft));
        } else {
          setTimeLeft(finalDuration);
        }

        if (savedSessionId) {
          setSessionId(savedSessionId);
        }

        if (savedTabSwitchCount) {
          tabSwitchCountRef.current = Number(savedTabSwitchCount) || 0;
        }
      } catch {
        router.push("/");
      }
    }

    loadPageData();
  }, [router]);

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

        if (sessionId) {
          await supabase
            .from("exam_sessions")
            .update({
              tab_switch_count: tabSwitchCountRef.current,
              time_left_seconds: timeLeft,
            })
            .eq("id", sessionId);
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
  }, [started, sessionId, timeLeft]);

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

  async function createExamSession(finalElective: ElectiveSubject, duration: number) {
    if (!candidate) return null;

    const { data, error } = await supabase
      .from("exam_sessions")
      .insert([
        {
          candidate_name: candidate.name,
          phone: candidate.phone,
          subject: finalElective,
          access_code: candidate.code || localStorage.getItem("access_code") || "",
          status: "started",
          auto_submitted: false,
          tab_switch_count: 0,
          time_left_seconds: duration,
        },
      ])
      .select("id")
      .single();

    if (error || !data) {
      console.error("Exam session creation failed:", error?.message);
      return null;
    }

    return data.id as string;
  }

  async function updateExamSessionOnSubmit(autoSubmitted: boolean) {
    if (!sessionId) return;

    const { error } = await supabase
      .from("exam_sessions")
      .update({
        submitted_at: new Date().toISOString(),
        status: "submitted",
        auto_submitted: autoSubmitted,
        tab_switch_count: tabSwitchCountRef.current,
        time_left_seconds: timeLeft,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Exam session submit update failed:", error.message);
    }
  }

  const handleStartExam = async () => {
    const finalElective =
      electiveSubject ||
      (candidate?.subject === "Biology" || candidate?.subject === "Mathematics"
        ? candidate.subject
        : "");

    if (!finalElective) {
      setError("Please select Biology or Mathematics before starting the exam.");
      return;
    }

    if (!mockEnabled) {
      setError("This exam is currently unavailable.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const paper = await buildExamPaper(finalElective as ElectiveSubject);
      const newSessionId = await createExamSession(
        finalElective as ElectiveSubject,
        examDuration
      );

      setQuestions(paper);
      setCurrentIndex(0);
      setAnswers({});
      setFlagged({});
      setStarted(true);
      setTimeLeft(examDuration);
      tabSwitchCountRef.current = 0;

      localStorage.setItem("examQuestions", JSON.stringify(paper));
      localStorage.setItem("selectedElective", finalElective);
      localStorage.removeItem("exam_result");
      localStorage.removeItem("latest_result_id");
      localStorage.removeItem("exam_flagged");
      localStorage.setItem("exam_tab_switch_count", "0");

      if (newSessionId) {
        setSessionId(newSessionId);
        localStorage.setItem("exam_session_id", newSessionId);
      } else {
        setSessionId(null);
        localStorage.removeItem("exam_session_id");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load exam questions."
      );
    } finally {
      setLoading(false);
    }
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

    if (!autoSubmitted) {
      const confirmed = window.confirm("Are you sure you want to submit?");
      if (!confirmed) return;
    }

    submitLockRef.current = true;

    const resultItems = questions.map((question) => {
      const selected = answers[String(question.id)] || null;

      return {
        id: String(question.id),
        subject: question.subject,
        type: question.section,
        text: question.question,
        options: {
          A: getOptionValue(question.option_a),
          B: getOptionValue(question.option_b),
          C: getOptionValue(question.option_c),
          D: getOptionValue(question.option_d),
        },
        correctAnswer: question.correct_answer as "A" | "B" | "C" | "D",
        explanation: question.explanation || "",
        userAnswer: selected,
        isCorrect: selected === question.correct_answer,
        flagged: Boolean(flagged[String(question.id)]),
        marks: Number(question.marks || 0),
      };
    });

    await updateExamSessionOnSubmit(autoSubmitted);

    localStorage.setItem("exam_result", JSON.stringify(resultItems));
    localStorage.removeItem("examQuestions");
    localStorage.removeItem("exam_answers");
    localStorage.removeItem("exam_flagged");
    localStorage.removeItem("exam_current_index");
    localStorage.removeItem("exam_time_left");
    localStorage.removeItem("exam_session_id");
    localStorage.removeItem("exam_tab_switch_count");

    if (autoSubmitted) {
      alert("Your exam has been submitted automatically.");
    }

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

            <div className="exam-soft-card mb-6 p-4 text-sm text-gray-700">
              <p>English</p>
              <p>Chemistry</p>
              <p>Physics</p>
              <p>{shouldChooseElective ? "Elective Subject" : candidate.subject}</p>
              <p className="mt-2 font-semibold">Total Score: 400</p>
              <p className="font-semibold">Duration: {formatTime(examDuration)}</p>
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
            <p className="text-sm text-gray-600">
              Candidate: {candidate.name} | Elective:{" "}
              {electiveSubject || candidate.subject} | Answered: {answeredCount} /{" "}
              {totalQuestions}
            </p>
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
                {currentIndex + 1}. {currentQuestion.question}
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: "A" as const, value: optionA },
                { key: "B" as const, value: optionB },
                { key: "C" as const, value: optionC },
                { key: "D" as const, value: optionD },
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