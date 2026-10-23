"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SampleOption {
  letter: "A" | "B" | "C" | "D";
  text: string;
}

interface QuestionItem {
  id: string;
  subject: string;
  examContext: string;
  question: string;
  options: SampleOption[];
  correctLetter: "A" | "B" | "C" | "D";
  explanation: string;
}

const QUESTION_POOL: QuestionItem[] = [
  {
    id: "bio-1",
    subject: "Biology",
    examContext: "JAMB UTME / WAEC Syllabus",
    question: "Which cellular organelle is primarily responsible for synthesizing adenosine triphosphate (ATP) during aerobic respiration?",
    options: [
      { letter: "A", text: "Ribosome" },
      { letter: "B", text: "Mitochondrion" },
      { letter: "C", text: "Endoplasmic reticulum" },
      { letter: "D", text: "Golgi apparatus" },
    ],
    correctLetter: "B",
    explanation: "Mitochondria are the primary sites of cellular respiration in eukaryotic cells. The Krebs cycle occurs in the mitochondrial matrix, while oxidative phosphorylation takes place along the inner membrane (cristae), generating ATP from glucose.",
  },
  {
    id: "math-1",
    subject: "Mathematics",
    examContext: "JAMB UTME / WAEC Algebra",
    question: "If log₁₀(x) + log₁₀(x - 3) = 1, find the positive value of x.",
    options: [
      { letter: "A", text: "2" },
      { letter: "B", text: "5" },
      { letter: "C", text: "10" },
      { letter: "D", text: "3" },
    ],
    correctLetter: "B",
    explanation: "Using logarithm laws: log₁₀[x(x - 3)] = 1, which implies x(x - 3) = 10¹ = 10. Rearranging gives the quadratic equation x² - 3x - 10 = 0. Factoring yields (x - 5)(x + 2) = 0. Since the logarithm argument must be strictly positive, x = 5.",
  },
  {
    id: "phy-1",
    subject: "Physics",
    examContext: "JAMB UTME Mechanics",
    question: "A body of mass 4 kg is moving with a uniform velocity of 15 m/s. What is its kinetic energy?",
    options: [
      { letter: "A", text: "60 J" },
      { letter: "B", text: "300 J" },
      { letter: "C", text: "450 J" },
      { letter: "D", text: "900 J" },
    ],
    correctLetter: "C",
    explanation: "Kinetic energy is given by the formula K.E. = ½mv². Substituting mass m = 4 kg and velocity v = 15 m/s: K.E. = ½ × 4 × (15)² = 2 × 225 = 450 Joules.",
  },
  {
    id: "chem-1",
    subject: "Chemistry",
    examContext: "JAMB UTME / WAEC Electrolysis",
    question: "Which gas is liberated at the cathode during the electrolysis of dilute tetraoxosulphate(VI) acid using platinum electrodes?",
    options: [
      { letter: "A", text: "Oxygen" },
      { letter: "B", text: "Hydrogen" },
      { letter: "C", text: "Sulphur(IV) oxide" },
      { letter: "D", text: "Chlorine" },
    ],
    correctLetter: "B",
    explanation: "In the electrolysis of dilute H₂SO₄, hydrogen ions (H⁺) migrate to the negative electrode (cathode) where they gain electrons to form hydrogen gas (2H⁺ + 2e⁻ → H₂). Oxygen gas is liberated at the anode.",
  },
  {
    id: "eng-1",
    subject: "English Language",
    examContext: "UTME Lexis & Structure (Concord)",
    question: "Choose the option that best completes the sentence: 'Neither the principal nor the teachers _______ present at the valedictory service yesterday.'",
    options: [
      { letter: "A", text: "were" },
      { letter: "B", text: "was" },
      { letter: "C", text: "is" },
      { letter: "D", text: "are being" },
    ],
    correctLetter: "A",
    explanation: "Under the grammatical rule of proximity in subject-verb agreement with correlative conjunctions ('neither... nor'), the finite verb agrees with the subject closer to it. 'Teachers' is plural and the event occurred in the past, requiring 'were'.",
  },
  {
    id: "econ-1",
    subject: "Economics",
    examContext: "WAEC / UTME Price Theory",
    question: "When the percentage change in quantity demanded is greater than the percentage change in price, price elasticity of demand is:",
    options: [
      { letter: "A", text: "Inelastic (Ep < 1)" },
      { letter: "B", text: "Unitary elastic (Ep = 1)" },
      { letter: "C", text: "Elastic (Ep > 1)" },
      { letter: "D", text: "Perfectline Inelastic (Ep = 0)" },
    ],
    correctLetter: "C",
    explanation: "Price elasticity of demand measures consumer responsiveness to price changes. When %ΔQd > %ΔP, the numerical coefficient Ep > 1, which defines price-elastic demand.",
  },
  {
    id: "govt-1",
    subject: "Government",
    examContext: "JAMB Constitutional Development",
    question: "Which Nigerian constitution formally established a federal system of government with residual legislative powers reserved for the regions?",
    options: [
      { letter: "A", text: "1946 Richards Constitution" },
      { letter: "B", text: "1951 Macpherson Constitution" },
      { letter: "C", text: "1954 Lyttelton Constitution" },
      { letter: "D", text: "1960 Independence Constitution" },
    ],
    correctLetter: "C",
    explanation: "The 1954 Lyttelton Constitution officially introduced federalism to Nigeria by dividing legislative powers between the federal government and autonomous regional governments, vesting residual powers in the regions.",
  },
];

export default function InteractiveSampleQuestion() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<"A" | "B" | "C" | "D" | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Initialize with a random question on client mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * QUESTION_POOL.length);
    setCurrentIndex(randomIndex);
  }, []);

  const currentQuestion = QUESTION_POOL[currentIndex];

  const handleSelect = (letter: "A" | "B" | "C" | "D") => {
    setSelectedLetter(letter);
    setShowFeedback(true);
  };

  const handleReset = () => {
    setSelectedLetter(null);
    setShowFeedback(false);
  };

  const handleNextRandom = () => {
    setIsShuffling(true);
    // Pick another index different from current
    let nextIdx = (currentIndex + 1) % QUESTION_POOL.length;
    if (QUESTION_POOL.length > 2) {
      const remainingIndices = QUESTION_POOL.map((_, i) => i).filter((i) => i !== currentIndex);
      nextIdx = remainingIndices[Math.floor(Math.random() * remainingIndices.length)];
    }
    setTimeout(() => {
      setCurrentIndex(nextIdx);
      setSelectedLetter(null);
      setShowFeedback(false);
      setIsShuffling(false);
    }, 150);
  };

  const isCorrect = selectedLetter === currentQuestion.correctLetter;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-8 dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Question Header & Context */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-blue-900 dark:text-cyan-300">
            {currentQuestion.subject}
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {currentQuestion.examContext}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {currentIndex + 1} of {QUESTION_POOL.length}
          </span>
          <button
            type="button"
            onClick={handleNextRandom}
            title="Randomly change question"
            disabled={isShuffling}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-0.5 text-xs font-bold text-blue-700 dark:text-cyan-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            <span>Next Random</span>
            <span aria-hidden="true" className={isShuffling ? "animate-spin" : ""}>🔀</span>
          </button>
        </div>
      </div>

      {/* Question Stem */}
      <div className="mt-5">
        <p className={`text-base font-extrabold leading-snug text-slate-900 dark:text-white sm:text-lg transition-opacity duration-150 ${isShuffling ? "opacity-30" : "opacity-100"}`}>
          {currentQuestion.question}
        </p>
      </div>

      {/* Option Cards */}
      <fieldset className={`mt-5 space-y-2.5 border-0 p-0 m-0 transition-opacity duration-150 ${isShuffling ? "opacity-30" : "opacity-100"}`}>
        <legend className="sr-only">Choose an answer for the sample question</legend>
        {currentQuestion.options.map((option) => {
          const isSelected = selectedLetter === option.letter;
          const isTargetCorrect = option.letter === currentQuestion.correctLetter;

          let cardStyle = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-200";
          let badgeStyle = "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300";

          if (showFeedback) {
            if (isTargetCorrect) {
              cardStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500 font-semibold";
              badgeStyle = "border-emerald-600 bg-emerald-600 text-white font-black";
            } else if (isSelected && !isTargetCorrect) {
              cardStyle = "border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-1 ring-rose-400";
              badgeStyle = "border-rose-600 bg-rose-600 text-white font-black";
            } else {
              cardStyle = "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 opacity-60";
              badgeStyle = "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500";
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
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">✓ Correct</span>
              )}
              {showFeedback && isSelected && !isTargetCorrect && (
                <span className="text-xs font-black text-rose-700 dark:text-rose-400">✕ Incorrect</span>
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
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100"
              : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
          }`}
        >
          <div className="flex items-center justify-between pb-1 font-bold">
            <span className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Syllabus Explanation
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-blue-700 dark:text-cyan-400 underline underline-offset-2 hover:opacity-80"
              >
                Try Again ↻
              </button>
              <button
                type="button"
                onClick={handleNextRandom}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:opacity-80"
              >
                Next Question →
              </button>
            </div>
          </div>
          <p className="mt-1 text-slate-700 dark:text-slate-300">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Call to Action leading to authentic CBT Portal */}
      <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Randomised sample from {QUESTION_POOL.length} subjects.</span>
          <button
            type="button"
            onClick={handleNextRandom}
            className="font-bold text-blue-700 dark:text-cyan-400 hover:underline"
          >
            Change Question 🔀
          </button>
        </div>
        <Link
          href="/cbt"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#012153] hover:bg-blue-950 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-blue-950/15 transition hover:-translate-y-0.5 active:scale-95"
        >
          <span>Full CBT Practice</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
