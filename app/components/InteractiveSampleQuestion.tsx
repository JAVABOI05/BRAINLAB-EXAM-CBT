"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface SampleOption {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
}

interface PublicQuestion {
  id: string;
  subjectSlug: string;
  subjectName: string;
  topicContext: string;
  questionText: string;
  options: SampleOption[];
  difficulty: "easy" | "medium" | "hard";
  totalInSubject?: number;
}

interface VerificationResult {
  ok: boolean;
  isCorrect: boolean;
  correctLetter: string;
  ruleTitle: string;
  explanation: string;
}

const SAMPLE_SUBJECTS = [
  { slug: "use-of-english", label: "Use of English", badge: "ENG" },
  { slug: "mathematics", label: "Mathematics", badge: "MTH" },
  { slug: "physics", label: "Physics", badge: "PHY" },
  { slug: "chemistry", label: "Chemistry", badge: "CHM" },
  { slug: "biology", label: "Biology", badge: "BIO" },
];

export default function InteractiveSampleQuestion() {
  const [selectedSubject, setSelectedSubject] = useState<string>("use-of-english");
  const [currentQuestion, setCurrentQuestion] = useState<PublicQuestion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedLetter, setSelectedLetter] = useState<"A" | "B" | "C" | "D" | "E" | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<VerificationResult | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState<string>("");

  const loadQuestion = useCallback(
    async (subject: string, exclude: string[] = []) => {
      setLoading(true);
      setErrorMsg(null);
      setSelectedLetter(null);
      setFeedback(null);

      try {
        const queryParams = new URLSearchParams({
          subject,
          exclude: exclude.join(","),
        });

        const res = await fetch(`/api/sample/question?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error("Could not load sample question");
        }

        const data = await res.json();
        if (data.ok && data.question) {
          setCurrentQuestion(data.question);
          setSeenIds((prev) => (prev.includes(data.question.id) ? prev : [...prev, data.question.id]));
        } else {
          throw new Error(data.error || "No question returned");
        }
      } catch (err: unknown) {
        console.warn("[Sample Question Load Fallback]", err);
        setErrorMsg("Unable to fetch online question. Check internet connection.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadQuestion(selectedSubject, []);
  }, [selectedSubject, loadQuestion]);

  const handleSelectOption = async (letter: "A" | "B" | "C" | "D" | "E") => {
    if (verifying || feedback || !currentQuestion) return;

    setSelectedLetter(letter);
    setVerifying(true);

    try {
      const res = await fetch("/api/sample/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedOption: letter,
          honeypot,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setFeedback(data);
      } else {
        setErrorMsg(data.error || "Verification failed");
      }
    } catch {
      setErrorMsg("Network error verifying response. Please retry.");
    } finally {
      setVerifying(false);
    }
  };

  const handleNext = () => {
    void loadQuestion(selectedSubject, seenIds);
  };

  const handleSubjectChange = (newSubject: string) => {
    if (newSubject === selectedSubject) return;
    setSelectedSubject(newSubject);
    setSeenIds([]);
  };

  const activeBadge =
    SAMPLE_SUBJECTS.find((s) => s.slug === selectedSubject)?.badge || "CBT";

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xl shadow-blue-950/5 transition-colors">
      {/* Invisible Bot Honeypot */}
      <input
        type="text"
        name="preferred_subject_confirmation"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {/* Subject Filter Tabs */}
      <div className="mb-4 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {SAMPLE_SUBJECTS.map((sub) => {
          const isActive = sub.slug === selectedSubject;
          return (
            <button
              key={sub.slug}
              type="button"
              onClick={() => handleSubjectChange(sub.slug)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-bold transition ${
                isActive
                  ? "bg-[#012153] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {sub.label}
            </button>
          );
        })}
      </div>

      {/* Question Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-900 text-xs font-black">
            {activeBadge}
          </span>
          <div>
            <p className="text-xs font-black text-slate-900">
              {currentQuestion?.subjectName || "JAMB UTME CBT Practice"}
            </p>
            <p className="text-[10px] text-slate-500">
              {currentQuestion?.topicContext || "Curated Public Assessment Sample"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            One-Question Delivery
          </span>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-xs text-slate-500 font-medium">Fetching authentic CBT sample question...</p>
        </div>
      ) : errorMsg && !currentQuestion ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
          <p className="font-bold">{errorMsg}</p>
          <button
            type="button"
            onClick={() => loadQuestion(selectedSubject, [])}
            className="mt-2 rounded-lg bg-rose-600 px-3 py-1 font-bold text-white transition hover:bg-rose-700"
          >
            Retry Loading
          </button>
        </div>
      ) : currentQuestion ? (
        <div>
          {/* Question Body */}
          <div>
            <p className="text-sm sm:text-base font-semibold leading-relaxed text-slate-900">
              {currentQuestion.questionText}
            </p>

            {/* Options Grid */}
            <div className="mt-4 space-y-2">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedLetter === option.letter;
                const isCorrectOption = feedback?.correctLetter === option.letter;

                let buttonStyle =
                  "border-slate-200 bg-slate-50/70 text-slate-800 hover:border-blue-300 hover:bg-blue-50/40";
                let badgeStyle = "bg-white text-slate-700 border-slate-200";

                if (feedback) {
                  if (isCorrectOption) {
                    buttonStyle =
                      "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-emerald-400";
                    badgeStyle = "bg-emerald-600 text-white border-emerald-600";
                  } else if (isSelected && !feedback.isCorrect) {
                    buttonStyle =
                      "border-rose-400 bg-rose-50/80 text-rose-950 ring-1 ring-rose-400";
                    badgeStyle = "bg-rose-600 text-white border-rose-600";
                  } else {
                    buttonStyle = "border-slate-200 bg-slate-50/30 text-slate-400 opacity-60";
                  }
                } else if (isSelected) {
                  buttonStyle =
                    "border-blue-600 bg-blue-50 text-blue-950 font-bold ring-1 ring-blue-500";
                  badgeStyle = "bg-blue-600 text-white border-blue-600";
                }

                return (
                  <button
                    key={option.letter}
                    type="button"
                    disabled={verifying || Boolean(feedback)}
                    onClick={() => handleSelectOption(option.letter)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl border p-3 text-left text-xs sm:text-sm transition-all duration-150 active:scale-[0.99] disabled:cursor-default ${buttonStyle}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${badgeStyle}`}
                    >
                      {option.letter}
                    </span>
                    <span className="flex-1">{option.text}</span>
                    {verifying && isSelected && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Server-Verified Answer Explanation */}
          {feedback && (
            <div
              className={`mt-4 rounded-2xl border p-4 text-xs transition-all ${
                feedback.isCorrect
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                  : "border-amber-200 bg-amber-50/90 text-amber-950"
              }`}
            >
              <div className="flex items-center justify-between font-black">
                <span className="flex items-center gap-1.5">
                  {feedback.isCorrect ? (
                    <>
                      <svg
                        className="h-4 w-4 text-emerald-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Correct Answer: Option {feedback.correctLetter}</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4 text-amber-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>Incorrect. Verified Option is {feedback.correctLetter}</span>
                    </>
                  )}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {feedback.ruleTitle}
                </span>
              </div>

              <p className="mt-2 text-slate-700 leading-relaxed">{feedback.explanation}</p>
            </div>
          )}

          {/* Sandbox Controls & Full CBT CTA */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <Link
              href="/cbt"
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 transition hover:bg-blue-100"
            >
              Full CBT Practice Test →
            </Link>

            <button
              type="button"
              onClick={handleNext}
              className="min-h-[38px] rounded-xl bg-[#012153] px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition hover:bg-blue-900"
            >
              Next Question →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
