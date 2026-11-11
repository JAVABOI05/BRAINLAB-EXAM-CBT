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
    <section className="relative overflow-hidden rounded-[2.5rem] border border-blue-900/40 bg-gradient-to-br from-[#020b1f] via-[#051638] to-[#010816] p-6 sm:p-10 text-white shadow-2xl">
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        {/* Banner Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
              Interactive Test · 90-Second Instant Sampler
            </span>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
            {completed ? "Completed 3 of 3" : `Question ${currentIndex + 1} of ${SAMPLE_QUESTIONS.length}`}
          </span>
        </div>

        {completed ? (
          /* Completion State */
          <div className="py-8 text-center animate-fade-in">
            <span className="text-5xl">🏆</span>
            <h3 className="mt-4 text-3xl font-black text-white">
              Mini Mock Finished: You Scored {score} / 3!
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-blue-200/80 leading-relaxed">
              {score === 3
                ? "Outstanding accuracy! You have strong grasp of core fundamentals. Ready to test yourself against the full 400-mark timed simulation?"
                : "Good attempt! You experienced how examiners engineer subtle trap options. Master every question type with our full question bank."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/cbt"
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 hover:bg-cyan-300 px-6 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-400/25 transition active:scale-95"
              >
                <span>🚀 Launch Full Free CBT Mock Exam</span>
                <span>→</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSelectedAnswers({});
                  setCurrentIndex(0);
                  setShowExplanation(false);
                  setCompleted(false);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-3.5 text-xs font-bold text-white transition active:scale-95"
              >
                <span>↺ Retake Mini Drill</span>
              </button>
            </div>
          </div>
        ) : (
          /* Question Display */
          <div className="mt-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                <span>{currentQ.subject}</span>
                <span>•</span>
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
                let btnStyle = "border-white/15 bg-white/5 hover:bg-white/10 text-slate-200";

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = "border-emerald-500 bg-emerald-950/60 text-emerald-200 ring-1 ring-emerald-500 font-bold";
                  } else if (isChosen) {
                    btnStyle = "border-rose-500 bg-rose-950/60 text-rose-200 ring-1 ring-rose-500 line-through opacity-80";
                  } else {
                    btnStyle = "border-white/10 bg-white/5 text-slate-400 opacity-60";
                  }
                }

                return (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelect(opt.key)}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left text-xs transition active:scale-98 ${btnStyle}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black">
                      {opt.key}
                    </span>
                    <span className="mt-0.5 leading-relaxed">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {/* Step-by-Step Derivation & Examiner Tip */}
            {showExplanation && (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-5 backdrop-blur-md animate-fade-in space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    💡 Master Worked Explanation
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      userChoice === currentQ.correct
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    }`}
                  >
                    {userChoice === currentQ.correct ? "✓ Correct!" : `✗ Missed (Key: ${currentQ.correct})`}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-blue-100">
                  {currentQ.explanation}
                </p>

                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-[11px] text-amber-200 leading-relaxed">
                  <strong>Examiner Insight:</strong> {currentQ.examinerTip}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 px-5 py-2 text-xs font-black text-slate-950 shadow-md transition active:scale-95"
                  >
                    <span>{currentIndex < SAMPLE_QUESTIONS.length - 1 ? "Next Question" : "See Final Score"}</span>
                    <span>→</span>
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
