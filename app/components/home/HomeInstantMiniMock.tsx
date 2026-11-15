"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/app/lib/analytics";

interface MiniQuestion {
  id: number;
  subject: string;
  exam: string;
  question: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
  examinerTip: string;
}

const SAMPLE_QUESTIONS: MiniQuestion[] = [
  {
    id: 1,
    subject: "Mathematics",
    exam: "JAMB UTME Algebra",
    question: "If 2x² + 5x + 3 = 0, find the values of x.",
    options: [
      { key: "A", text: "x = -1 or x = -3/2" },
      { key: "B", text: "x = 1 or x = 3/2" },
      { key: "C", text: "x = -1 or x = 3/2" },
      { key: "D", text: "x = 1 or x = -3/2" },
    ],
    correct: "A",
    explanation: "Factorise: 2x² + 2x + 3x + 3 = 0  ⟹  2x(x + 1) + 3(x + 1) = 0  ⟹  (2x + 3)(x + 1) = 0. Hence x = -3/2 or x = -1.",
    examinerTip: "Examiner Trap: Forgetting to reverse signs when solving factors (x + 1 = 0 ⟹ x = -1, not +1).",
  },
  {
    id: 2,
    subject: "English Language",
    exam: "JAMB UTME Lexis & Structure",
    question: "Choose the option that correctly completes the sentence: 'Neither the principal nor the teachers _______ present at the meeting.'",
    options: [
      { key: "A", text: "was" },
      { key: "B", text: "were" },
      { key: "C", text: "is" },
      { key: "D", text: "are being" },
    ],
    correct: "B",
    explanation: "Rule of Proximity: In 'Neither... nor' constructions, the verb agrees with the closer subject. Since 'the teachers' (plural) is closer to the verb than 'the principal', the plural past verb 'were' is correct.",
    examinerTip: "Examiner Trap: Blindly matching the verb to the first singular noun 'the principal'.",
  },
  {
    id: 3,
    subject: "Chemistry",
    exam: "JAMB UTME Redox & States",
    question: "What is the oxidation number of Manganese (Mn) in KMnO₄?",
    options: [
      { key: "A", text: "+5" },
      { key: "B", text: "+6" },
      { key: "C", text: "+7" },
      { key: "D", text: "+4" },
    ],
    correct: "C",
    explanation: "Potassium has +1, Oxygen has -2. For neutral KMnO₄: (+1) + Mn + 4(-2) = 0  ⟹  1 + Mn - 8 = 0  ⟹  Mn - 7 = 0  ⟹  Mn = +7.",
    examinerTip: "Examiner Trap: Forgetting there are 4 oxygen atoms (giving -8 total), leading candidates to guess +5.",
  },
];

export default function HomeInstantMiniMock() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentQ = SAMPLE_QUESTIONS[currentIndex];
  const userChoice = selectedAnswers[currentQ.id];
  const isAnswered = Boolean(userChoice);

  function handleSelect(optionKey: "A" | "B" | "C" | "D") {
    if (selectedAnswers[currentQ.id]) return; // lock once answered

    const updated = { ...selectedAnswers, [currentQ.id]: optionKey };
    setSelectedAnswers(updated);
    setShowExplanation(true);

    trackEvent("instant_mini_mock_answered", {
      questionId: currentQ.id,
      subject: currentQ.subject,
      correct: optionKey === currentQ.correct,
    });
  }

  function handleNext() {
    setShowExplanation(false);
    if (currentIndex < SAMPLE_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompleted(true);
      trackEvent("instant_mini_mock_completed", {
        score: Object.entries(selectedAnswers).filter(([id, ans]) => {
          const q = SAMPLE_QUESTIONS.find((sq) => sq.id === Number(id));
          return q?.correct === ans;
        }).length,
      });
    }
  }

  const score = Object.entries(selectedAnswers).filter(([id, ans]) => {
    const q = SAMPLE_QUESTIONS.find((sq) => sq.id === Number(id));
    return q?.correct === ans;
  }).length;

  return (
    <section
      id="instant-mini-mock"
      aria-label="Interactive 90-Second Instant Sampler Mini-Mock"
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/95 via-[#0b1426]/90 to-slate-900/95 p-6 sm:p-10 text-white shadow-2xl backdrop-blur-xl"
    >
      {/* Ambient Radial Accent */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        {/* Banner Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
              Interactive Test &bull; 90-Second Instant Sampler
            </span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
            {completed ? "Completed 3 of 3" : `Question ${currentIndex + 1} of ${SAMPLE_QUESTIONS.length}`}
          </span>
        </div>

        {completed ? (
          /* Completion State */
          <div className="py-8 text-center animate-fade-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 mb-2">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
                <path d="M18 4H6v7a6 6 0 0 0 12 0V4z" />
              </svg>
            </div>
            <h3 className="mt-4 text-2xl sm:text-3xl font-black text-white">
              Mini Mock Finished: You Scored {score} / 3!
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300 leading-relaxed">
              {score === 3
                ? "Outstanding accuracy! You have strong grasp of core fundamentals. Ready to test yourself against the full 400-mark timed simulation?"
                : "Good attempt! You experienced how examiners engineer subtle trap options. Master every question type with our full question bank."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:translate-y-0.5 px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all bl-focus-ring min-h-[48px]"
              >
                <span>Launch Full CBT Mock Exam</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSelectedAnswers({});
                  setCurrentIndex(0);
                  setShowExplanation(false);
                  setCompleted(false);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800 hover:bg-slate-700 active:translate-y-0.5 px-5 py-3.5 text-xs font-bold text-white transition-all bl-focus-ring min-h-[48px]"
              >
                <span>↺ Retake Mini Drill</span>
              </button>
            </div>
          </div>
        ) : (
          /* Question Display */
          <div className="mt-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold">
                <span>{currentQ.subject}</span>
                <span>&bull;</span>
                <span className="text-slate-400">{currentQ.exam}</span>
              </div>
              <h3 className="mt-2 text-lg sm:text-xl font-black text-white leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt) => {
                const isChosen = userChoice === opt.key;
                const isCorrect = opt.key === currentQ.correct;
                let btnStyle = "border border-white/10 bg-slate-800/80 hover:border-cyan-400/50 hover:bg-slate-800 text-slate-100";

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = "border-2 border-emerald-400 bg-emerald-950/60 text-emerald-100 ring-2 ring-emerald-500/30 font-bold shadow-md shadow-emerald-900/30";
                  } else if (isChosen) {
                    btnStyle = "border-2 border-rose-400 bg-rose-950/60 text-rose-100 opacity-90 line-through shadow-md shadow-rose-900/30";
                  } else {
                    btnStyle = "border border-white/5 bg-slate-900/60 text-slate-500 opacity-50";
                  }
                }

                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelect(opt.key)}
                    className={`flex items-start gap-3 rounded-2xl p-4 text-left text-xs transition active:translate-y-0.5 min-h-[44px] bl-focus-ring ${btnStyle}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-xs font-black text-white shadow-xs">
                      {opt.key}
                    </span>
                    <span className="mt-1 leading-relaxed font-medium">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Step-by-Step Derivation & Examiner Tip */}
            {showExplanation && (
              <div className="rounded-2xl border border-blue-500/30 bg-blue-950/40 p-5 animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-cyan-300">
                    <svg className="h-3.5 w-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                    </svg>
                    <span>Master Worked Explanation</span>
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      userChoice === currentQ.correct
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {userChoice === currentQ.correct ? (
                      <>
                        <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Correct!</span>
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>Missed (Key: {currentQ.correct})</span>
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                  {currentQ.explanation}
                </p>

                <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200 leading-relaxed">
                  <strong>Examiner Insight:</strong> {currentQ.examinerTip}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/30 active:translate-y-0.5 transition-all bl-focus-ring"
                  >
                    <span>{currentIndex < SAMPLE_QUESTIONS.length - 1 ? "Next Question" : "See Final Score"}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
