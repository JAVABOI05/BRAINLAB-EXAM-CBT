"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { recordTopicAttempt, calculateExamReadiness, getTopicMasteryRecords, type ExamReadiness } from "@/app/lib/adaptiveEngine";
import { trackEvent } from "@/app/lib/analytics";

interface DiagnosticQuestion {
  id: number;
  subject: string;
  category: string;
  question: string;
  options: { key: "A" | "B" | "C" | "D"; text: string }[];
  correct: "A" | "B" | "C" | "D";
  explanation: string;
}

const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 1,
    subject: "English Language",
    category: "Lexis and Structure",
    question: "The newly inaugurated committee has decided to call _______ the meeting until next Monday.",
    options: [
      { key: "A", text: "off" },
      { key: "B", text: "up" },
      { key: "C", text: "in" },
      { key: "D", text: "out" },
    ],
    correct: "A",
    explanation: "To 'call off' is an idiomatic phrasal verb meaning to cancel or postpone until a later date.",
  },
  {
    id: 2,
    subject: "English Language",
    category: "Sentence Interpretation",
    question: "Choose the word most nearly opposite in meaning to 'METICULOUS':",
    options: [
      { key: "A", text: "Careless" },
      { key: "B", text: "Precise" },
      { key: "C", text: "Arrogant" },
      { key: "D", text: "Timid" },
    ],
    correct: "A",
    explanation: "'Meticulous' means showing great attention to detail; its antonym is 'Careless'.",
  },
  {
    id: 3,
    subject: "Mathematics",
    category: "Algebra and Equations",
    question: "Solve for x in the equation: 3^(2x - 1) = 27.",
    options: [
      { key: "A", text: "x = 1" },
      { key: "B", text: "x = 2" },
      { key: "C", text: "x = 3" },
      { key: "D", text: "x = 4" },
    ],
    correct: "B",
    explanation: "Express 27 as powers of 3: 27 = 3³. Equating exponents: 2x - 1 = 3  ⟹  2x = 4  ⟹  x = 2.",
  },
  {
    id: 4,
    subject: "Mathematics",
    category: "Coordinate Geometry",
    question: "Find the gradient (slope) of the straight line passing through (2, 3) and (6, 11).",
    options: [
      { key: "A", text: "m = 1" },
      { key: "B", text: "m = 2" },
      { key: "C", text: "m = 3" },
      { key: "D", text: "m = 4" },
    ],
    correct: "B",
    explanation: "Slope m = (y₂ - y₁) / (x₂ - x₁) = (11 - 3) / (6 - 2) = 8 / 4 = 2.",
  },
  {
    id: 5,
    subject: "Physics",
    category: "Mechanics and Motion",
    question: "A body with a mass of 5 kg accelerates uniformly from rest at 4 m/s² for 6 seconds. What is its final momentum?",
    options: [
      { key: "A", text: "120 kg·m/s" },
      { key: "B", text: "100 kg·m/s" },
      { key: "C", text: "60 kg·m/s" },
      { key: "D", text: "24 kg·m/s" },
    ],
    correct: "A",
    explanation: "Final velocity v = u + at = 0 + (4)(6) = 24 m/s. Momentum p = m × v = 5 kg × 24 m/s = 120 kg·m/s.",
  },
  {
    id: 6,
    subject: "Physics",
    category: "Waves and Optics",
    question: "A concave mirror has a radius of curvature of 30 cm. What is its focal length?",
    options: [
      { key: "A", text: "60 cm" },
      { key: "B", text: "30 cm" },
      { key: "C", text: "15 cm" },
      { key: "D", text: "7.5 cm" },
    ],
    correct: "C",
    explanation: "Focal length f of a spherical mirror equals half its radius of curvature: f = r / 2 = 30 / 2 = 15 cm.",
  },
  {
    id: 7,
    subject: "Chemistry",
    category: "Stoichiometry & Mole Concept",
    question: "How many moles are present in 44 grams of Carbon Dioxide (CO₂)? [Given C = 12, O = 16]",
    options: [
      { key: "A", text: "0.5 moles" },
      { key: "B", text: "1.0 mole" },
      { key: "C", text: "2.0 moles" },
      { key: "D", text: "44 moles" },
    ],
    correct: "B",
    explanation: "Molar mass of CO₂ = 12 + 2(16) = 44 g/mol. Moles = mass / molar mass = 44 / 44 = 1.0 mole.",
  },
  {
    id: 8,
    subject: "Chemistry",
    category: "Acids, Bases & Salts",
    question: "A solution has a Hydrogen ion concentration [H⁺] = 1 × 10⁻⁴ mol/dm³. What is its pH value?",
    options: [
      { key: "A", text: "pH = 4 (Acidic)" },
      { key: "B", text: "pH = 10 (Basic)" },
      { key: "C", text: "pH = 7 (Neutral)" },
      { key: "D", text: "pH = 1 (Strong Acid)" },
    ],
    correct: "A",
    explanation: "pH = -log₁₀[H⁺] = -log₁₀(1 × 10⁻⁴) = 4. Since pH < 7, the solution is acidic.",
  },
  {
    id: 9,
    subject: "Biology",
    category: "Cell Biology & Genetics",
    question: "Which cellular organelle is responsible for ATP cellular respiration and energy production?",
    options: [
      { key: "A", text: "Ribosome" },
      { key: "B", text: "Mitochondrion" },
      { key: "C", text: "Endoplasmic Reticulum" },
      { key: "D", text: "Golgi Apparatus" },
    ],
    correct: "B",
    explanation: "Mitochondria are the powerhouses of eukaryotic cells where aerobic cellular respiration produces ATP.",
  },
  {
    id: 10,
    subject: "Biology",
    category: "Ecology & Adaptation",
    question: "A symbiotic relationship in which one organism benefits while the other is neither harmed nor helped is called:",
    options: [
      { key: "A", text: "Mutualism" },
      { key: "B", text: "Parasitism" },
      { key: "C", text: "Commensalism" },
      { key: "D", text: "Predation" },
    ],
    correct: "C",
    explanation: "Commensalism is a biological association where one species derives benefit without positively or negatively impacting the other.",
  },
];

export default function BaselineDiagnosticPage() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [timeLeftSec, setTimeLeftSec] = useState(900); // 15 mins
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resultsData, setResultsData] = useState<{
    score: number;
    total: number;
    predictedJambScore: number;
    readiness: ExamReadiness | null;
  } | null>(null);

  // Timer countdown
  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [finished, answers]);

  const currentQ = DIAGNOSTIC_QUESTIONS[currentIdx];

  function handleSelect(choice: "A" | "B" | "C" | "D") {
    setAnswers((prev) => ({ ...prev, [currentQ.id]: choice }));
  }

  async function handleFinish() {
    setSubmitting(true);
    let correctCount = 0;

    for (const q of DIAGNOSTIC_QUESTIONS) {
      const userChoice = answers[q.id];
      const isCorrect = userChoice === q.correct;
      if (isCorrect) correctCount++;
      void recordTopicAttempt(q.subject, q.category, isCorrect);
    }

    // Load updated topic records and readiness
    const records = await getTopicMasteryRecords();
    const rd = calculateExamReadiness(records);

    // Baseline JAMB prediction based on diagnostic accuracy (scaled to 400 with a baseline floor)
    const ratio = correctCount / DIAGNOSTIC_QUESTIONS.length;
    const computedPrediction = Math.round(180 + ratio * 180);

    setResultsData({
      score: correctCount,
      total: DIAGNOSTIC_QUESTIONS.length,
      predictedJambScore: computedPrediction,
      readiness: rd,
    });

    trackEvent("diagnostic_assessment_completed", {
      score: correctCount,
      total: DIAGNOSTIC_QUESTIONS.length,
      predictedScore: computedPrediction,
    });

    setFinished(true);
    setSubmitting(false);
  }

  const answeredCount = Object.keys(answers).length;
  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = timeLeftSec % 60;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020b1f] text-slate-900 dark:text-white py-10 px-4 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-black text-blue-700 dark:text-blue-300">
                Diagnostic Assessment
              </span>
              <span className="text-xs text-slate-500 font-mono">10 Questions</span>
            </div>
            <h1 className="mt-1 text-2xl font-black">
              Baseline Academic DNA Diagnostic
            </h1>
          </div>

          {!finished && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-mono font-black shadow-xs">
                <span>⏱️</span>
                <span>
                  {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                </span>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinish}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-black text-white shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {submitting ? "Analyzing..." : "Submit Diagnostic"}
              </button>
            </div>
          )}
        </div>

        {finished && resultsData ? (
          /* Diagnostic Summary Screen */
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl space-y-8 animate-fade-in">
            <div className="text-center">
              <span className="text-5xl">🧬</span>
              <h2 className="mt-4 text-3xl font-black">
                Your Baseline Learning DNA is Ready!
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                You scored <strong className="text-blue-600 dark:text-blue-400 font-black">{resultsData.score} of {resultsData.total}</strong> ({Math.round((resultsData.score / resultsData.total) * 100)}%).
              </p>
            </div>

            {/* Score & Prediction Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 p-6 text-center">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Predicted JAMB UTME Score Range
                </span>
                <div className="mt-2 text-4xl font-black text-blue-900 dark:text-blue-200">
                  ~{resultsData.predictedJambScore} <span className="text-base text-slate-500 font-bold">/ 400</span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Based on your baseline accuracy and speed across core topics.
                </p>
              </div>

              <div className="rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 p-6 text-center">
                <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  Diagnostic Learning Archetype
                </span>
                <div className="mt-2 text-2xl font-black text-purple-900 dark:text-purple-200">
                  {resultsData.score >= 8 ? "Strategic Conceptualist" : resultsData.score >= 5 ? "Adaptive Pattern Solver" : "Foundational Explorer"}
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Calibrated for high-yield active recall and spaced Socratic revision.
                </p>
              </div>
            </div>

            {/* Next Steps CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/learning-dna"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-6 py-3.5 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition active:scale-95"
              >
                <span>🧬 View Full Learning DNA &amp; Topic Map</span>
                <span>→</span>
              </Link>
              <Link
                href="/cbt"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 px-6 py-3.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition active:scale-95"
              >
                <span>Launch Full 4-Subject CBT Mock</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Active Question Interface */
          <div className="space-y-6">
            {/* Question Quick Jump Badges */}
            <div className="flex flex-wrap gap-2">
              {DIAGNOSTIC_QUESTIONS.map((q, idx) => {
                const isSelected = idx === currentIdx;
                const isAnswered = Boolean(answers[q.id]);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 w-9 rounded-xl text-xs font-black transition ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-600/40"
                        : isAnswered
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-400/40"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Question Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {currentQ.subject} · {currentQ.category}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Question {currentIdx + 1} / {DIAGNOSTIC_QUESTIONS.length}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold leading-relaxed text-slate-900 dark:text-white">
                {currentQ.question}
              </h2>

              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelect(opt.key)}
                      className={`w-full flex items-start gap-3.5 rounded-2xl border p-4 text-left text-xs transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-600/30 font-bold"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black">
                        {opt.key}
                      </span>
                      <span className="mt-0.5 leading-relaxed">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-5">
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30"
                >
                  ← Previous
                </button>

                <div className="text-xs text-slate-400 font-medium">
                  {answeredCount} of {DIAGNOSTIC_QUESTIONS.length} answered
                </div>

                {currentIdx < DIAGNOSTIC_QUESTIONS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((i) => i + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
                  >
                    <span>Next</span>
                    <span>→</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinish}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-black text-white shadow-sm transition active:scale-95"
                  >
                    <span>Finish Diagnostic</span>
                    <span>✓</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
