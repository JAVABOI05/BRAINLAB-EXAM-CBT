"use client";

import { useState } from "react";
import Link from "next/link";

interface SampleOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

const SAMPLE_QUESTION = {
  subject: "Biology",
  examContext: "JAMB UTME / WAEC Syllabus",
  question: "Which cellular organelle is primarily responsible for synthesizing adenosine triphosphate (ATP) during aerobic respiration?",
  options: [
    { letter: "A", text: "Ribosome" },
    { letter: "B", text: "Mitochondrion" },
    { letter: "C", text: "Endoplasmic reticulum" },
    { letter: "D", text: "Golgi apparatus" },
  ] as SampleOption[],
  correctLetter: "B" as const,
  explanation:
    "Mitochondria are the primary sites of cellular respiration in eukaryotic cells. The Krebs cycle occurs in the mitochondrial matrix, while oxidative phosphorylation takes place along the inner membrane (cristae), generating ATP from glucose.",
};

export default function InteractiveSampleQuestion() {
  const [selectedLetter, setSelectedLetter] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSelect = (letter: "A" | "B" | "C" | "D") => {
    setSelectedLetter(letter);
    setShowFeedback(true);
  };

  const handleReset = () => {
    setSelectedLetter(null);
    setShowFeedback(false);
  };

  const isCorrect = selectedLetter === SAMPLE_QUESTION.correctLetter;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-8">
      {/* Question Header & Context */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900">
            {SAMPLE_QUESTION.subject}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {SAMPLE_QUESTION.examContext}
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600">
          Interactive Sample
        </span>
      </div>

      {/* Question Stem */}
      <div className="mt-5">
        <p className="text-base font-extrabold leading-snug text-slate-900 sm:text-lg">
          {SAMPLE_QUESTION.question}
        </p>
      </div>

      {/* Option Cards */}
      <fieldset className="mt-5 space-y-2.5 border-0 p-0 m-0">
        <legend className="sr-only">Choose an answer for the sample question</legend>
        {SAMPLE_QUESTION.options.map((option) => {
          const isSelected = selectedLetter === option.letter;
          const isTargetCorrect = option.letter === SAMPLE_QUESTION.correctLetter;

          let cardStyle = "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-800";
          let badgeStyle = "border-slate-300 bg-slate-100 text-slate-700";

          if (showFeedback) {
            if (isTargetCorrect) {
              cardStyle = "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500 font-semibold";
              badgeStyle = "border-emerald-600 bg-emerald-600 text-white font-black";
            } else if (isSelected && !isTargetCorrect) {
              cardStyle = "border-rose-400 bg-rose-50 text-rose-950 ring-1 ring-rose-400";
              badgeStyle = "border-rose-600 bg-rose-600 text-white font-black";
            } else {
              cardStyle = "border-slate-200 bg-slate-50/60 text-slate-400 opacity-60";
              badgeStyle = "border-slate-200 bg-slate-100 text-slate-400";
            }
          }

          return (
            <button
              key={option.letter}
              type="button"
              onClick={() => handleSelect(option.letter)}
              className={`flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${cardStyle}`}
              aria-pressed={isSelected}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-xs transition ${badgeStyle}`}
              >
                {option.letter}
              </span>
              <span className="flex-1 font-medium leading-relaxed">{option.text}</span>
              {showFeedback && isTargetCorrect && (
                <span className="text-xs font-black text-emerald-700">✓ Correct</span>
              )}
              {showFeedback && isSelected && !isTargetCorrect && (
                <span className="text-xs font-black text-rose-700">✕ Incorrect</span>
              )}
            </button>
          );
        })}
      </fieldset>

      {/* Explanation Box when an option is selected */}
      {showFeedback && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-5 rounded-2xl border p-4 text-xs sm:text-sm leading-relaxed ${
            isCorrect
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
              : "border-slate-200 bg-slate-50 text-slate-800"
          }`}
        >
          <div className="flex items-center justify-between pb-1 font-bold">
            <span className="text-xs uppercase tracking-wider text-slate-600">
              Sample Syllabus Explanation
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold text-blue-700 underline underline-offset-2 hover:text-blue-900"
            >
              Try Again ↻
            </button>
          </div>
          <p className="mt-1 text-slate-700">{SAMPLE_QUESTION.explanation}</p>
        </div>
      )}

      {/* Call to Action leading to authentic CBT Portal */}
      <div className="mt-6 border-t border-slate-100 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-slate-500">
          Ready for full timed subject tests and past questions?
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#012153] hover:bg-blue-950 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-950/15 transition hover:-translate-y-0.5 active:scale-95"
        >
          <span>Start CBT Practice</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
